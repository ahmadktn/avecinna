import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbPrimary } from '../db/clientPrimary.js';
import { patients } from '../db/schemaPrimary.js';
import { evaluateCAAC } from '../services/caacEngine.js';
import { filterPatientRecordByRole } from '../services/dtoMasker.js';
import { appendAuditBlock } from '../services/merkleEngine.js';
import { createSecurityAlert } from '../services/scannerService.js';
import { eq } from 'drizzle-orm';

export async function breakGlassRoutes(fastify: FastifyInstance) {
  // 1. POST /patients/:id/break-glass/tier1 (Immediate Emergency View - 0 Delay)
  fastify.post(
    '/patients/:id/break-glass/tier1',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Two-Tier Break-Glass Emergency'],
        summary: 'Tier 1 Immediate Emergency View',
        description:
          'Provides instant 0-delay access to critical emergency fields (demographics, vitals, allergies, code status) for out-of-ward acute patients.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'p-peds-01' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id: patientId } = request.params;
      const session = request.userSession || request.user;

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

      // B. Filter into Tier 1 Emergency Summary Mask
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
        tier: 'TIER_1_EMERGENCY_SUMMARY',
        message: 'Tier 1 Immediate Emergency View granted.',
        emergencySummary,
        auditBlockHash,
      });
    }
  );

  // 2. POST /patients/:id/break-glass/tier2 (Reasoned Full Record Unlock)
  fastify.post(
    '/patients/:id/break-glass/tier2',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Two-Tier Break-Glass Emergency'],
        summary: 'Tier 2 Reasoned Full Record Unlock',
        description:
          'Unlocks full clinical record for acute emergencies. Requires mandatory justification reason (min 10 chars), appends cryptographic audit block, and creates high-priority security alert.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'p-peds-01' },
          },
        },
        body: {
          type: 'object',
          required: ['justificationReason'],
          properties: {
            justificationReason: {
              type: 'string',
              minLength: 10,
              example: 'Patient collapsed in ER with acute anaphylaxis requiring full history.',
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id: patientId } = request.params;
      const body: any = request.body || {};
      const justificationReason = body.justificationReason || body.justification;
      const session = request.userSession || request.user;

      if (!justificationReason || justificationReason.trim().length < 10) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Tier 2 Break-Glass requires a justificationReason (Minimum 10 characters required).',
        });
      }

      // A. Fetch Patient Record
      const patientRows = await dbPrimary.select().from(patients).where(eq(patients.id, patientId)).limit(1);
      if (patientRows.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Patient record does not exist.' });
      }

      const rawPatient = patientRows[0];

      // B. Unmask Full Clinical Record (Doctor level emergency unlock)
      const patientRecord = filterPatientRecordByRole(rawPatient, 'DOCTOR', false);

      // C. AUTOMATIC Server-Side Audit Log to avecinna_audit_db
      const auditBlockHash = await appendAuditBlock({
        userId: session.userId,
        patientId: patientId,
        action: 'BREAK_GLASS_TIER_2',
        activeWard: session.activeWardId,
        relationshipType: 'BREAK_GLASS',
        payload: {
          tier: 2,
          justificationReason,
        },
      });

      // D. AUTOMATIC High-Priority Security Alert in avecinna_primary_db
      const alertId = await createSecurityAlert({
        alertType: 'BREAK_GLASS_ACTIVATION',
        severity: 'HIGH',
        userId: session.userId,
        patientId: patientId,
        description: `Tier 2 Break-Glass activated by ${session.username} (${session.role}) for patient ${rawPatient.mrn}. Justification: ${justificationReason}.`,
        metadata: { justificationReason, auditBlockHash },
      });

      return reply.send({
        tier: 'TIER_2_FULL_RECORD_UNLOCKED',
        message: 'Tier 2 Full Record Access granted. Security Alert generated for administrative review.',
        patientRecord,
        alertId,
        auditBlockHash,
      });
    }
  );
}

export default breakGlassRoutes;
