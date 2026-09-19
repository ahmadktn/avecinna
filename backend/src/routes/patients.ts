import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbPrimary } from '../db/clientPrimary.js';
import { patients, careTeams, wards } from '../db/schemaPrimary.js';
import { evaluateCAAC } from '../services/caacEngine.js';
import { filterPatientRecordByRole } from '../services/dtoMasker.js';
import { appendAuditBlock } from '../services/merkleEngine.js';
import { eq, and, or, isNull, gte, inArray } from 'drizzle-orm';
import crypto from 'crypto';

export async function patientRoutes(fastify: FastifyInstance) {
  // 1. GET /patients/:id (Retrieve Single Patient Record with CAAC + Role DTO Masking)
  fastify.get(
    '/patients/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Patient Records (CAAC & DTO)'],
        summary: 'Get Single Patient Record (Role DTO Masked & CAAC Protected)',
        description:
          'Evaluates CAAC rule (Permit = RoleValid AND ShiftActive AND (ActiveWard == PatientWard OR CareTeam OR OutpatientDoctor)). Applies OWASP API3 role DTO filter and Admin clinical redaction.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'p-cardio-01' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id: patientId } = request.params;
      const session = request.userSession || request.user;

      // A. Evaluate CAAC Authorization
      const caacResult = await evaluateCAAC({
        userId: session.userId,
        role: session.role,
        activeWardId: session.activeWardId,
        patientId: patientId,
        shiftStart: session.shiftStart,
        shiftEnd: session.shiftEnd,
      });

      // B. If CAAC Denied -> Log Blocked Event in Isolated Audit DB & Return 403
      if (!caacResult.isPermitted) {
        await appendAuditBlock({
          userId: session.userId,
          patientId: patientId,
          action: 'PATIENT_VIEW_BLOCKED',
          activeWard: session.activeWardId,
          payload: { reason: caacResult.denialReason },
          request,
        });

        return reply.status(403).send({
          error: 'Forbidden',
          message: caacResult.denialReason || 'Access denied by Context-Aware Access Control.',
        });
      }

      // C. Filter Raw Patient Record by User Role (OWASP API3 Mitigation & Admin Redaction)
      const rawPatient = caacResult.patient;
      const maskedPatient = filterPatientRecordByRole(rawPatient, session.role, false);

      // D. Append Success View Block to Isolated Audit DB
      await appendAuditBlock({
        userId: session.userId,
        patientId: patientId,
        action: 'PATIENT_VIEW_SUCCESS',
        activeWard: session.activeWardId,
        relationshipType: caacResult.relationshipType || undefined,
        payload: { relationshipType: caacResult.relationshipType },
        request,
      });

      return reply.send({
        patient: maskedPatient,
        relationshipType: caacResult.relationshipType,
      });
    }
  );

  // 2. GET /patients (List Patients in Active Ward Scope & Permitted Care Teams)
  fastify.get(
    '/patients',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Patient Records (CAAC & DTO)'],
        summary: 'List Patients in Active Ward Scope & Care Teams',
        description:
          'Retrieves patient directory for clinician active ward context and active care team assignments, filtered by role DTO mask.',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            scope: { type: 'string', enum: ['all', 'ward', 'care_team'], default: 'all' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = (request as any).userSession || (request as any).user;
      const query = (request.query || {}) as any;
      const scope = query.scope || 'all';

      const now = new Date();

      // A. Fetch active Care Team grants for calling user
      const myCareTeams = await dbPrimary
        .select({
          careTeamId: careTeams.id,
          patientId: careTeams.patientId,
          relationshipType: careTeams.relationshipType,
          grantReason: careTeams.grantReason,
          expiresAt: careTeams.expiresAt,
        })
        .from(careTeams)
        .where(
          and(
            eq(careTeams.staffId, session.userId),
            or(isNull(careTeams.expiresAt), gte(careTeams.expiresAt, now))
          )
        );

      const careTeamMap = new Map<string, any>();
      for (const ct of myCareTeams) {
        careTeamMap.set(ct.patientId, ct);
      }

      // B. Fetch Ward Inpatients (if scope is 'all' or 'ward')
      let activeWardPatients: any[] = [];
      if (scope === 'all' || scope === 'ward') {
        activeWardPatients = await dbPrimary
          .select()
          .from(patients)
          .where(eq(patients.primaryWardId, session.activeWardId));
      }

      // C. Fetch Care Team Patients (if scope is 'all' or 'care_team')
      let careTeamPatients: any[] = [];
      if (scope === 'all' || scope === 'care_team') {
        const wardPatientIds = new Set(activeWardPatients.map((p) => p.id));
        const ctPatientIdsToFetch = Array.from(careTeamMap.keys()).filter((id) =>
          scope === 'care_team' ? true : !wardPatientIds.has(id)
        );

        if (ctPatientIdsToFetch.length > 0) {
          careTeamPatients = await dbPrimary
            .select()
            .from(patients)
            .where(inArray(patients.id, ctPatientIdsToFetch));
        }
      }

      // D. Combine and Tag with Relationship Context & Mask DTO
      const combinedList: any[] = [];

      if (scope !== 'care_team') {
        for (const p of activeWardPatients) {
          const ct = careTeamMap.get(p.id);
          const masked = filterPatientRecordByRole(p, session.role, false);
          combinedList.push({
            ...masked,
            relationshipType: ct?.relationshipType || 'PRIMARY',
            isCareTeam: !!ct,
            careTeamGrant: ct || null,
          });
        }
      }

      for (const p of careTeamPatients) {
        const ct = careTeamMap.get(p.id);
        const masked = filterPatientRecordByRole(p, session.role, false);
        combinedList.push({
          ...masked,
          relationshipType: ct?.relationshipType || 'CONSULT',
          isCareTeam: true,
          careTeamGrant: ct || null,
        });
      }

      return reply.send({
        activeWardId: session.activeWardId,
        count: combinedList.length,
        patients: combinedList,
      });
    }
  );

  // 3. POST /patients (Create / Register New Patient Record)
  fastify.post(
    '/patients',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Patient Records (CAAC & DTO)'],
        summary: 'Register New Patient Record',
        description: 'Registers a new inpatient or outpatient record with demographics and primary ward assignment.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['mrn', 'fullName', 'dateOfBirth', 'gender', 'primaryWardId'],
          properties: {
            mrn: { type: 'string', example: 'MRN-2026-9090' },
            fullName: { type: 'string', example: 'Tunde Bakare' },
            dateOfBirth: { type: 'string', example: '1985-06-15' },
            gender: { type: 'string', example: 'MALE' },
            patientType: { type: 'string', enum: ['INPATIENT', 'OUTPATIENT'], example: 'INPATIENT' },
            genotype: { type: 'string', example: 'AA' },
            bloodGroup: { type: 'string', example: 'O+' },
            primaryWardId: { type: 'string', example: 'w-cardio' },
            assignedBed: { type: 'string', example: 'CARD-BED-12' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = request.userSession || request.user;
      const body: any = request.body || {};
      const {
        mrn,
        fullName,
        dateOfBirth,
        gender,
        patientType = 'INPATIENT',
        genotype,
        bloodGroup,
        primaryWardId,
        assignedBed,
      } = body;

      if (!mrn || !fullName || !dateOfBirth || !gender || !primaryWardId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'mrn, fullName, dateOfBirth, gender, and primaryWardId are required.',
        });
      }

      const newPatientId = crypto.randomUUID();

      const [newPatient] = await dbPrimary
        .insert(patients)
        .values({
          id: newPatientId,
          mrn,
          fullName,
          dateOfBirth,
          gender,
          patientType,
          genotype,
          bloodGroup,
          primaryWardId,
          assignedBed,
          allergiesJson: { allergies: [] },
          emergencySummaryJson: { allergies: [], activeMedications: [] },
          fullRecordJson: { clinicalHistory: [] },
        })
        .returning();

      await appendAuditBlock({
        userId: session.userId,
        patientId: newPatientId,
        action: 'PATIENT_CREATE',
        activeWard: session.activeWardId,
        payload: { mrn, fullName, primaryWardId },
        request,
      });

      return reply.status(201).send({
        message: 'Patient registered successfully.',
        patient: filterPatientRecordByRole(newPatient, session.role, false),
      });
    }
  );
}

export default patientRoutes;
