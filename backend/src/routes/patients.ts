import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbPrimary } from '../db/clientPrimary.js';
import { patients } from '../db/schemaPrimary.js';
import { evaluateCAAC } from '../services/caacEngine.js';
import { filterPatientRecordByRole } from '../services/dtoMasker.js';
import { appendAuditBlock } from '../services/merkleEngine.js';
import { eq } from 'drizzle-orm';

export default async function patientRoutes(fastify: FastifyInstance) {
  // 1. GET /api/v1/patients/:id (Retrieve Single Patient Record with CAAC + Role DTO Masking)
  fastify.get(
    '/api/v1/patients/:id',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id: patientId } = request.params;
      const session = request.userSession;

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
        });

        return reply.status(403).send({
          error: 'Forbidden',
          message: caacResult.denialReason || 'Access denied by Context-Aware Access Control.',
        });
      }

      // C. Filter Raw Patient Record by User Role (OWASP API3 Mitigation & Admin Redaction)
      const rawPatient = caacResult.patient;
      const maskedPatient = filterPatientRecordByRole(rawPatient, session.role, false);

      // D. Append Success View Block to Isolated Audit DB (avecinna_audit_db)
      await appendAuditBlock({
        userId: session.userId,
        patientId: patientId,
        action: 'PATIENT_VIEW_SUCCESS',
        activeWard: session.activeWardId,
        relationshipType: caacResult.relationshipType || undefined,
        payload: { relationshipType: caacResult.relationshipType },
      });

      return reply.send({
        patient: maskedPatient,
        relationshipType: caacResult.relationshipType,
      });
    }
  );

  // 2. GET /api/v1/patients (List Patients in Active Ward or Permitted Scope)
  fastify.get(
    '/api/v1/patients',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = request.userSession;

      // Fetch patients in active ward
      const activeWardPatients = await dbPrimary
        .select()
        .from(patients)
        .where(eq(patients.primaryWardId, session.activeWardId));

      const maskedList = activeWardPatients.map((p) => filterPatientRecordByRole(p, session.role, false));

      return reply.send({
        activeWardId: session.activeWardId,
        count: maskedList.length,
        patients: maskedList,
      });
    }
  );
}
