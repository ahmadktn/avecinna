import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyHashChainIntegrity, computeMerkleRoot } from '../services/merkleEngine';
import { dbPrimary } from '../db/clientPrimary';
import { securityAlerts } from '../db/schemaPrimary';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';

interface UpdateAlertBody {
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
}

export async function auditRoutes(fastify: FastifyInstance) {
  // 1. Audit Chain Integrity Verification Endpoint
  fastify.post(
    '/audit/verify',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      
      // Only ADMIN or HEAD_OF_UNIT can verify audit ledger integrity
      if (user.role !== 'ADMIN' && user.role !== 'HEAD_OF_UNIT') {
        return reply.status(403).send({ error: 'Only ADMIN or HEAD_OF_UNIT can verify audit ledger integrity' });
      }

      const chainVerification = await verifyHashChainIntegrity();
      const merkleRoot = await computeMerkleRoot();

      return reply.send({
        valid: chainVerification.valid,
        totalBlocks: chainVerification.totalBlocks,
        merkleRoot,
        brokenBlockId: chainVerification.brokenBlockId || null,
        message: chainVerification.valid
          ? `Audit chain is 100% cryptographically intact with ${chainVerification.totalBlocks} blocks.`
          : `CRITICAL TAMPERING DETECTED at block ${chainVerification.brokenBlockId}!`,
      });
    }
  );

  // 2. Get Security Alerts
  fastify.get(
    '/security/alerts',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;

      if (user.role !== 'ADMIN' && user.role !== 'HEAD_OF_UNIT') {
        return reply.status(403).send({ error: 'Access restricted to ADMIN or HEAD_OF_UNIT' });
      }

      const alerts = await dbPrimary
        .select()
        .from(securityAlerts)
        .orderBy(desc(securityAlerts.createdAt));

      return reply.send({ alerts });
    }
  );

  // 3. Update Security Alert Status
  fastify.patch(
    '/security/alerts/:id',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateAlertBody }>, reply: FastifyReply) => {
      const user = request.user;
      const { id: alertId } = request.params;
      const { status } = request.body;

      if (user.role !== 'ADMIN' && user.role !== 'HEAD_OF_UNIT') {
        return reply.status(403).send({ error: 'Access restricted to ADMIN or HEAD_OF_UNIT' });
      }

      if (!status) {
        return reply.status(400).send({ error: 'Missing status field' });
      }

      const [updated] = await dbPrimary
        .update(securityAlerts)
        .set({ status })
        .where(eq(securityAlerts.id, alertId))
        .returning();

      if (!updated) {
        return reply.status(404).send({ error: 'Alert not found' });
      }

      return reply.send({ message: 'Alert updated successfully', alert: updated });
    }
  );
}
