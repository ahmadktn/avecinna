import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbPrimary } from '../db/clientPrimary.js';
import { patients, users, wards, careTeams, wardRosters } from '../db/schemaPrimary.js';
import { eq, and, or, desc, isNull, gte, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { evaluateCAAC } from '../services/caacEngine.js';
import { filterPatientRecordByRole } from '../services/dtoMasker.js';
import { appendAuditBlock } from '../services/merkleEngine.js';

export async function nurseRoutes(fastify: FastifyInstance) {
  // Middleware: Require clinical role (NURSE, PARAMEDIC, DOCTOR, HEAD_OF_UNIT)
  const requireClinicalRole = async (request: FastifyRequest, reply: FastifyReply) => {
    const session = (request as any).userSession || (request as any).user;
    const role = session?.role;
    const allowed = ['NURSE', 'PARAMEDIC', 'DOCTOR', 'HEAD_OF_UNIT'];
    if (!role || !allowed.includes(role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Access restricted to active clinical nursing or medical staff only.',
      });
    }
  };

  // 1. GET /nurse/overview (Comprehensive Nursing Station Telemetry)
  fastify.get(
    '/nurse/overview',
    {
      preHandler: [fastify.authenticate, requireClinicalRole],
      schema: {
        tags: ['Nurse Clinical Workflows'],
        summary: 'Nurse Station Overview Telemetry & Patient Census',
        description: 'Retrieves ward patient census, acuity breakdown, care team assignments, and today shift status.',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = (request as any).userSession || (request as any).user;
      const wardId = session.activeWardId || session.homeWardId;
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);

      // A. Active Ward Info
      const [activeWard] = await dbPrimary.select().from(wards).where(eq(wards.id, wardId)).limit(1);

      // B. Inpatients admitted to active ward
      const activeWardPatients = await dbPrimary
        .select()
        .from(patients)
        .where(eq(patients.primaryWardId, wardId));

      // C. Care Team consults/assignments for this nurse (across any ward)
      const myCareTeams = await dbPrimary
        .select({
          careTeamId: careTeams.id,
          patientId: careTeams.patientId,
          relationshipType: careTeams.relationshipType,
          grantReason: careTeams.grantReason,
          expiresAt: careTeams.expiresAt,
          patientName: patients.fullName,
          patientMrn: patients.mrn,
          assignedBed: patients.assignedBed,
          patientWardId: patients.primaryWardId,
          wardName: wards.name,
          wardCode: wards.code,
        })
        .from(careTeams)
        .innerJoin(patients, eq(careTeams.patientId, patients.id))
        .leftJoin(wards, eq(patients.primaryWardId, wards.id))
        .where(
          and(
            eq(careTeams.staffId, session.userId),
            or(isNull(careTeams.expiresAt), gte(careTeams.expiresAt, now))
          )
        )
        .orderBy(desc(careTeams.createdAt));

      // D. Acuity Breakdown Calculation
      let criticalCount = 0;
      let monitoringCount = 0;
      let stableCount = 0;

      const formattedWardPatients = activeWardPatients.map((p) => {
        const vitals = (p.fullRecordJson as any)?.vitals || (p.emergencySummaryJson as any)?.vitals || {};
        const hr = Number(vitals.hr) || 72;
        const spo2 = Number(vitals.spo2) || 98;
        let acuity: 'stable' | 'monitoring' | 'critical' = 'stable';

        if (hr > 120 || spo2 < 90) {
          criticalCount++;
          acuity = 'critical';
        } else if (hr > 100 || spo2 < 95) {
          monitoringCount++;
          acuity = 'monitoring';
        } else {
          stableCount++;
          acuity = 'stable';
        }

        const masked = filterPatientRecordByRole(p, session.role, false);
        return {
          ...masked,
          acuity,
          diagnosis: (p.fullRecordJson as any)?.diagnosis || 'Clinical Inpatient Surveillance',
        };
      });

      // E. Today's Shift assignment for this nurse
      const [todayShift] = await dbPrimary
        .select()
        .from(wardRosters)
        .where(
          and(
            eq(wardRosters.staffId, session.userId),
            eq(wardRosters.shiftDate, todayStr)
          )
        )
        .limit(1);

      return reply.send({
        activeWard: activeWard || { id: wardId, code: 'WARD', name: 'Clinical Ward', department: 'Inpatient Care' },
        metrics: {
          wardInpatientsCount: activeWardPatients.length,
          myCareTeamCount: myCareTeams.length,
          criticalCount,
          monitoringCount,
          stableCount,
          bedOccupancyRate: Math.min(100, Math.round((activeWardPatients.length / Math.max(1, 15)) * 100)),
          isShiftActive: !!todayShift ? todayShift.status === 'ON_DUTY' : true,
        },
        todayShift: todayShift || {
          shiftType: 'DAY',
          startTime: '07:00',
          endTime: '19:00',
          status: 'ON_DUTY',
          notes: 'Ward Nursing & Telemetry Watch',
        },
        wardPatients: formattedWardPatients.slice(0, 8),
        careTeamPatients: myCareTeams,
      });
    }
  );

  // 2. POST /nurse/vitals (Record Bedside Vital Signs Observation with CAAC & Audit)
  fastify.post(
    '/nurse/vitals',
    {
      preHandler: [fastify.authenticate, requireClinicalRole],
      schema: {
        tags: ['Nurse Clinical Workflows'],
        summary: 'Record Bedside Vital Signs Observation',
        description: 'Evaluates CAAC authorization, records patient vital signs, updates live telemetry, and logs to the isolated audit ledger.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['patientId'],
          properties: {
            patientId: { type: 'string' },
            bp: { type: 'string', example: '120/80' },
            hr: { type: 'number', example: 74 },
            spo2: { type: 'number', example: 98 },
            temp: { type: 'string', example: '36.8' },
            rr: { type: 'number', example: 16 },
            bloodGlucose: { type: 'string', example: '5.4' },
            notes: { type: 'string', example: 'Patient alert and oriented, comfortable in bed' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = (request as any).userSession || (request as any).user;
      const body = (request.body || {}) as any;
      const { patientId, bp, hr, spo2, temp, rr, bloodGlucose, notes } = body;

      // 1. Evaluate CAAC Authorization (Nurse must be in Patient's Ward OR on Care Team)
      const caac = await evaluateCAAC({
        userId: session.userId,
        role: session.role,
        activeWardId: session.activeWardId,
        patientId,
        shiftStart: session.shiftStart,
        shiftEnd: session.shiftEnd,
      });

      if (!caac.isPermitted) {
        await appendAuditBlock({
          userId: session.userId,
          patientId,
          action: 'VITALS_RECORD_BLOCKED',
          activeWard: session.activeWardId,
          payload: { reason: caac.denialReason },
          request,
        });

        return reply.status(403).send({
          error: 'Forbidden',
          message: caac.denialReason || 'Access denied: You are not assigned to this patient ward or care team.',
        });
      }

      const patient = caac.patient;
      const existingFullRecord = (patient.fullRecordJson as any) || {};
      const existingVitalObservations = existingFullRecord.vitalObservations || [];

      const now = new Date();
      const newVitalsObj = {
        bp: bp || existingFullRecord.vitals?.bp || '120/80',
        hr: hr !== undefined ? Number(hr) : existingFullRecord.vitals?.hr || 72,
        spo2: spo2 !== undefined ? Number(spo2) : existingFullRecord.vitals?.spo2 || 98,
        temp: temp || existingFullRecord.vitals?.temp || '36.8',
        rr: rr !== undefined ? Number(rr) : existingFullRecord.vitals?.rr || 16,
        bloodGlucose: bloodGlucose || existingFullRecord.vitals?.bloodGlucose,
      };

      const newObservationRecord = {
        id: crypto.randomUUID(),
        recordedBy: session.username,
        recordedByRole: session.role,
        recordedAt: now.toISOString(),
        vitals: newVitalsObj,
        notes: notes || 'Routine nursing round observations recorded',
      };

      const updatedFullRecord = {
        ...existingFullRecord,
        vitals: newVitalsObj,
        vitalObservations: [newObservationRecord, ...existingVitalObservations.slice(0, 49)],
      };

      const existingEmergencySummary = (patient.emergencySummaryJson as any) || {};
      const updatedEmergencySummary = {
        ...existingEmergencySummary,
        vitals: newVitalsObj,
      };

      // 2. Persist update in Primary Database
      const [updatedPatient] = await dbPrimary
        .update(patients)
        .set({
          fullRecordJson: updatedFullRecord,
          emergencySummaryJson: updatedEmergencySummary,
          updatedAt: now,
        })
        .where(eq(patients.id, patientId))
        .returning();

      // 3. Append Audit Block to Isolated Audit DB
      await appendAuditBlock({
        userId: session.userId,
        patientId,
        action: 'VITALS_OBSERVATION_RECORDED',
        activeWard: session.activeWardId,
        relationshipType: caac.relationshipType || undefined,
        payload: {
          observationId: newObservationRecord.id,
          vitals: newVitalsObj,
          relationshipType: caac.relationshipType,
        },
        request,
      });

      return reply.send({
        message: 'Vital signs observation recorded successfully.',
        observation: newObservationRecord,
        patient: filterPatientRecordByRole(updatedPatient, session.role, false),
      });
    }
  );
}

export default nurseRoutes;
