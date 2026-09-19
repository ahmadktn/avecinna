import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbPrimary } from '../db/clientPrimary.js';
import { patients, users, wards, outpatientAppointments, careTeams, labResults } from '../db/schemaPrimary.js';
import { eq, and, or, desc, gte, lte, isNull, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { appendAuditBlock } from '../services/merkleEngine.js';
import { filterPatientRecordByRole } from '../services/dtoMasker.js';
import { evaluateCAAC } from '../services/caacEngine.js';

export async function doctorRoutes(fastify: FastifyInstance) {
  // 1. GET /doctor/overview (Real Clinician Telemetry & Active Shift Roster)
  fastify.get(
    '/doctor/overview',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Doctor Clinical Workflows'],
        summary: 'Doctor Clinical Overview & Patient Telemetry',
        description:
          'Retrieves active ward patient count, assigned consults, today outpatient queue, and vital condition telemetry.',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = request.userSession || request.user;

      // A. Patients in Doctor's Active Ward
      const activeWardPatients = await dbPrimary
        .select()
        .from(patients)
        .where(eq(patients.primaryWardId, session.activeWardId));

      // B. Care Team Consult Patients
      const now = new Date();
      const myCareTeams = await dbPrimary
        .select({
          patientId: careTeams.patientId,
          relationshipType: careTeams.relationshipType,
          expiresAt: careTeams.expiresAt,
        })
        .from(careTeams)
        .where(
          and(
            eq(careTeams.staffId, session.userId),
            or(isNull(careTeams.expiresAt), gte(careTeams.expiresAt, now))
          )
        );

      const consultPatientIds = myCareTeams.map((c) => c.patientId);

      // C. Today's Appointments / Consultation Queue for this doctor
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todayAppts = await dbPrimary
        .select({
          id: outpatientAppointments.id,
          patientId: outpatientAppointments.patientId,
          patientName: patients.fullName,
          patientMrn: patients.mrn,
          patientGender: patients.gender,
          appointmentDate: outpatientAppointments.appointmentDate,
          status: outpatientAppointments.status,
          notes: outpatientAppointments.notes,
        })
        .from(outpatientAppointments)
        .leftJoin(patients, eq(outpatientAppointments.patientId, patients.id))
        .where(
          and(
            eq(outpatientAppointments.doctorId, session.userId),
            gte(outpatientAppointments.appointmentDate, startOfDay),
            lte(outpatientAppointments.appointmentDate, endOfDay)
          )
        )
        .orderBy(desc(outpatientAppointments.appointmentDate));

      // D. Active Ward Information
      const wardRows = await dbPrimary.select().from(wards).where(eq(wards.id, session.activeWardId)).limit(1);
      const activeWard = wardRows[0];

      // E. Condition Breakdown (Stable, Monitoring, Critical)
      let stableCount = 0;
      let monitoringCount = 0;
      let criticalCount = 0;

      for (const p of activeWardPatients) {
        const vitals = (p.fullRecordJson as any)?.vitals || (p.emergencySummaryJson as any)?.vitals || {};
        const hr = Number(vitals.hr) || 72;
        const spo2 = Number(vitals.spo2) || 98;
        if (hr > 120 || spo2 < 90) {
          criticalCount++;
        } else if (hr > 100 || spo2 < 95) {
          monitoringCount++;
        } else {
          stableCount++;
        }
      }

      return reply.send({
        activeWard,
        metrics: {
          activeWardPatientsCount: activeWardPatients.length,
          careTeamConsultsCount: consultPatientIds.length,
          todayConsultationsCount: todayAppts.length,
          todayPendingConsultations: todayAppts.filter((a) => a.status === 'SCHEDULED').length,
          todayActiveConsultations: todayAppts.filter((a) => a.status === 'IN_CONSULTATION').length,
          todayCompletedConsultations: todayAppts.filter((a) => a.status === 'COMPLETED').length,
          stableCount,
          monitoringCount,
          criticalCount,
        },
        todayAppointments: todayAppts,
        activeWardPatients: activeWardPatients.slice(0, 8).map((p) => filterPatientRecordByRole(p, session.role, false)),
      });
    }
  );

  // 2. POST /doctor/encounters (Complete Clinical Encounter: SOAP Note, Vitals, Prescriptions, Lab Orders)
  fastify.post(
    '/doctor/encounters',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Doctor Clinical Workflows'],
        summary: 'Record Clinical Consultation Encounter & Add Medical Records',
        description:
          'Adds clinical SOAP notes, updates vitals, prescribes medications, orders lab tests, and completes consultation slot with cryptographic audit logging.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['patientId'],
          properties: {
            patientId: { type: 'string' },
            appointmentId: { type: 'string' },
            diagnosis: { type: 'string' },
            soapNotes: {
              type: 'object',
              properties: {
                subjective: { type: 'string' },
                objective: { type: 'string' },
                assessment: { type: 'string' },
                plan: { type: 'string' },
              },
            },
            vitals: {
              type: 'object',
              properties: {
                bp: { type: 'string' },
                hr: { type: 'number' },
                spo2: { type: 'number' },
                temperature: { type: 'string' },
                respiratoryRate: { type: 'number' },
              },
            },
            prescriptions: {
              type: 'array',
              items: {
                type: 'object',
                required: ['medicationName', 'dosage', 'frequency'],
                properties: {
                  medicationName: { type: 'string' },
                  dosage: { type: 'string' },
                  frequency: { type: 'string' },
                  route: { type: 'string' },
                  duration: { type: 'string' },
                  instructions: { type: 'string' },
                },
              },
            },
            labOrders: {
              type: 'array',
              items: {
                type: 'object',
                required: ['testName', 'category'],
                properties: {
                  testName: { type: 'string' },
                  category: { type: 'string' },
                  priority: { type: 'string' },
                  clinicalIndication: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = request.userSession || request.user;
      const body: any = request.body || {};
      const {
        patientId,
        appointmentId,
        diagnosis,
        soapNotes = {},
        vitals = {},
        prescriptions = [],
        labOrders = [],
      } = body;

      // 1. Evaluate CAAC Authorization for this doctor
      const caac = await evaluateCAAC({
        userId: session.userId,
        role: session.role,
        activeWardId: session.activeWardId,
        patientId,
        shiftStart: session.shiftStart,
        shiftEnd: session.shiftEnd,
      });

      if (!caac.isPermitted) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: caac.denialReason || 'Access denied by Context-Aware Access Control.',
        });
      }

      const patient = caac.patient;
      const existingFullRecord = (patient.fullRecordJson as any) || {};
      const existingClinicalNotes = existingFullRecord.clinicalNotes || [];
      const existingActiveMeds = existingFullRecord.activeMedications || [];
      const existingHistory = existingFullRecord.medicalHistory || [];

      // 2. Format new SOAP note entry
      const now = new Date();
      const newNoteEntry = {
        id: crypto.randomUUID(),
        author: session.username,
        authorRole: session.role,
        date: now.toISOString(),
        diagnosis: diagnosis || existingFullRecord.diagnosis || 'Clinical evaluation completed',
        soap: soapNotes,
      };

      // 3. Update Prescriptions & Active Medications
      const formattedPrescriptions = prescriptions.map((p: any) => ({
        id: crypto.randomUUID(),
        name: p.medicationName,
        dosage: p.dosage,
        frequency: p.frequency,
        route: p.route || 'Oral',
        duration: p.duration || '7 days',
        prescribedBy: session.username,
        prescribedAt: now.toISOString(),
        instructions: p.instructions || '',
      }));

      const updatedActiveMeds = [...existingActiveMeds, ...formattedPrescriptions];

      // 4. Update Full Record JSON
      const updatedFullRecord = {
        ...existingFullRecord,
        diagnosis: diagnosis || existingFullRecord.diagnosis,
        vitals: Object.keys(vitals).length > 0 ? { ...existingFullRecord.vitals, ...vitals } : existingFullRecord.vitals,
        activeMedications: updatedActiveMeds,
        clinicalNotes: [newNoteEntry, ...existingClinicalNotes],
        medicalHistory: diagnosis ? [`${now.toISOString().slice(0, 10)}: ${diagnosis}`, ...existingHistory] : existingHistory,
      };

      // 5. Update Emergency Summary JSON
      const existingEmergencySummary = (patient.emergencySummaryJson as any) || {};
      const updatedEmergencySummary = {
        ...existingEmergencySummary,
        vitals: updatedFullRecord.vitals || existingEmergencySummary.vitals,
        activeMedications: updatedActiveMeds,
        allergies: patient.allergiesJson || existingEmergencySummary.allergies || [],
      };

      // 6. Save changes to Primary DB
      const [updatedPatient] = await dbPrimary
        .update(patients)
        .set({
          fullRecordJson: updatedFullRecord,
          emergencySummaryJson: updatedEmergencySummary,
          updatedAt: now,
        })
        .where(eq(patients.id, patientId))
        .returning();

      // 7. If appointmentId provided -> update status to COMPLETED
      if (appointmentId) {
        await dbPrimary
          .update(outpatientAppointments)
          .set({ status: 'COMPLETED' })
          .where(eq(outpatientAppointments.id, appointmentId));
      }

      // 8. If lab orders created -> insert into labResults table
      const createdLabOrders = [];
      for (const order of labOrders) {
        const labId = crypto.randomUUID();
        const dummyPayload = JSON.stringify({ patientId, testName: order.testName, orderedAt: now });
        const dummyHash = crypto.createHash('sha256').update(dummyPayload).digest('hex');

        const [createdOrder] = await dbPrimary
          .insert(labResults)
          .values({
            id: labId,
            patientId,
            orderingDoctorId: session.userId,
            testName: order.testName,
            category: order.category || 'General Laboratory',
            status: 'PENDING',
            documentHash: dummyHash,
            resultDataJson: {
              priority: order.priority || 'ROUTINE',
              indication: order.clinicalIndication || '',
              orderedAt: now.toISOString(),
            },
          })
          .returning();
        createdLabOrders.push(createdOrder);
      }

      // 9. Append Cryptographic Audit Block
      await appendAuditBlock({
        userId: session.userId,
        patientId,
        action: 'CLINICAL_ENCOUNTER_RECORDED',
        activeWard: session.activeWardId,
        relationshipType: caac.relationshipType || undefined,
        payload: {
          encounterId: newNoteEntry.id,
          diagnosis,
          prescriptionsCount: prescriptions.length,
          labOrdersCount: labOrders.length,
          appointmentId,
        },
      });

      return reply.status(201).send({
        message: 'Clinical encounter and medical records recorded successfully.',
        encounterId: newNoteEntry.id,
        patient: filterPatientRecordByRole(updatedPatient, session.role, false),
        createdLabOrders,
      });
    }
  );
}

export default doctorRoutes;
