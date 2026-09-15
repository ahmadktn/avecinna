import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbPrimary } from '../db/clientPrimary.js';
import { patients } from '../db/schemaPrimary.js';
import { evaluateCAAC } from '../services/caacEngine.js';
import { filterPatientRecordByRole } from '../services/dtoMasker.js';
import { appendAuditBlock } from '../services/merkleEngine.js';
import { createSecurityAlert } from '../services/scannerService.js';
import { eq } from 'drizzle-orm';

export default async function breakGlassRoutes(fastify: FastifyInstance) {
  // 1. POST /api/v1/patients/:id/break-glass/tier1 (Immediate Emergency View - 0 Delay)
  fastify.post(
    '/api/v1/patients/:id/break-glass/tier1',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id: patientId } = request.params;
      const session = request.userSession;

      // A. Evaluate CAAC with Emergency Override flag
      const caacResult = await evaluateCAAC({
        userId: session.userId,
        role: session.role,
        activeWardId: session.activeWardId,
        patientId: patientId,
        isBreakGlass: true,
      });

      if (!caacResult.patient) {
        return reply.status(404).send({ error: 'Not Found', message: 'Patient record does not exist.' });
      }

      // B. Filter into Tier 1 Emergency Summary Mask (vitals, allergies, active meds, code status)
      const emergencySummary = filterPatientRecordByRole(caacResult.patient, session.role, true);

      // C. AUTOMATIC Server-Side Audit Log to avecinna_audit_db
      const auditBlockHash = await appendAuditBlock({
        userId: session.userId,
        patientId: patientId,
        action: 'BREAK_GLASS_TIER_1',
        activeWard: session.activeWardId,
        relationshipType: 'BREAK_GLASS',
        payload: { tier: 1, action: 'EMERGENCY_SUMMARY_VIEW' },
      });

      return reply.send({
        tier: 1,
        message: 'Tier 1 Immediate Emergency View granted.',
        data: emergencySummary,
        auditBlockHash,
      });
    }
  );

  // 2. POST /api/v1/patients/:id/break-glass/tier2 (Reasoned Full Record Unlock)
  fastify.post(
    '/api/v1/patients/:id/break-glass/tier2',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id: patientId } = request.params;
      const body: any = request.body || {};
      const { reasonCode, justification } = body;
      const session = request.userSession;

      if (!reasonCode) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Tier 2 Break-Glass requires a reasonCode (e.g. CARDIAC_ARREST, TRAUMA_RESUSCITATION, UNCONSCIOUS_PATIENT, OTHER).',
        });
      }

      // A. Fetch Patient Record
      const patientRows = await dbPrimary.select().from(patients).where(eq(patients.id, patientId)).limit(1);
      if (patientRows.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Patient record does not exist.' });
      }

      const rawPatient = patientRows[0];

      // B. Unmask Full Clinical Record (Doctor level emergency unlock)
      const fullRecord = filterPatientRecordByRole(rawPatient, 'DOCTOR', false);

      // C. AUTOMATIC Server-Side Audit Log to avecinna_audit_db
      const auditBlockHash = await appendAuditBlock({
        userId: session.userId,
        patientId: patientId,
        action: 'BREAK_GLASS_TIER_2',
        activeWard: session.activeWardId,
        relationshipType: 'BREAK_GLASS',
        payload: {
          tier: 2,
          reasonCode,
          justification: justification || 'N/A',
        },
      });

      // D. AUTOMATIC High-Priority Security Alert in avecinna_primary_db
      const alertId = await createSecurityAlert({
        alertType: 'EXCESSIVE_BREAK_GLASS',
        severity: 'HIGH',
        userId: session.userId,
        patientId: patientId,
        description: `Tier 2 Break-Glass activated by ${session.username} (${session.role}) for patient ${rawPatient.mrn}. Reason: ${reasonCode}. Justification: ${justification || 'None provided'}.`,
        metadata: { reasonCode, justification, auditBlockHash },
      });

      return reply.send({
        tier: 2,
        message: 'Tier 2 Full Record Access granted. Security Alert generated for administrative review.',
        data: fullRecord,
        alertId,
        auditBlockHash,
      });
    }
  );
}
