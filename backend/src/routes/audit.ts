import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  verifyHashChainIntegrity,
  computeMerkleRoot,
  getMerkleTreeHierarchy,
  getAuditLedgerAnalytics,
} from '../services/merkleEngine.js';
import { dbPrimary } from '../db/clientPrimary.js';
import { dbAudit } from '../db/clientAudit.js';
import { securityAlerts } from '../db/schemaPrimary.js';
import { auditBlocks } from '../db/schemaAudit.js';
import { eq, desc, ilike, or, and, sql } from 'drizzle-orm';

interface UpdateAlertBody {
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
}

export async function auditRoutes(fastify: FastifyInstance) {
  // 1. Audit Chain Integrity Verification Endpoint
  fastify.post(
    '/audit/verify',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Cryptographic Audit Ledger & Security Alerts'],
        summary: 'Verify Audit Ledger Hash Chain & Merkle Root',
        description:
          'Performs real-time sequential SHA-256 hash chain link verification and binary Merkle Tree root calculation over avecinna_audit_db.',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.userSession || request.user;

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

  // 2. GET /audit/blocks - Paginated real audit ledger blocks with search & filter
  fastify.get(
    '/audit/blocks',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Cryptographic Audit Ledger & Security Alerts'],
        summary: 'Query Audit Ledger Blocks',
        description: 'Returns real sequential audit blocks from avecinna_audit_db with pagination and search.',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', default: 1 },
            limit: { type: 'integer', default: 20 },
            search: { type: 'string' },
            action: { type: 'string' },
            ward: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: { page?: number; limit?: number; search?: string; action?: string; ward?: string };
      }>,
      reply: FastifyReply
    ) => {
      const user = request.userSession || request.user;
      if (user.role !== 'ADMIN' && user.role !== 'HEAD_OF_UNIT') {
        return reply.status(403).send({ error: 'Access restricted to ADMIN or HEAD_OF_UNIT' });
      }

      const page = Math.max(1, Number(request.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 20));
      const offset = (page - 1) * limit;

      const { search, action, ward } = request.query;

      const conditions: any[] = [];
      if (search && search.trim()) {
        const s = `%${search.trim()}%`;
        conditions.push(
          or(
            ilike(auditBlocks.blockHash, s),
            ilike(auditBlocks.userId, s),
            ilike(auditBlocks.patientId, s),
            ilike(auditBlocks.action, s),
            ilike(auditBlocks.activeWard, s)
          )
        );
      }
      if (action && action.trim() && action !== 'ALL') {
        conditions.push(eq(auditBlocks.action, action.trim()));
      }
      if (ward && ward.trim() && ward !== 'ALL') {
        conditions.push(eq(auditBlocks.activeWard, ward.trim()));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await dbAudit
        .select({ count: sql<number>`count(*)::int` })
        .from(auditBlocks)
        .where(whereClause);

      const total = countResult?.count || 0;

      const blocks = await dbAudit
        .select()
        .from(auditBlocks)
        .where(whereClause)
        .orderBy(desc(auditBlocks.indexNum))
        .limit(limit)
        .offset(offset);

      return reply.send({
        blocks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }
  );

  // 3. GET /audit/analytics - Dedicated Ledger Analytics & Summary
  fastify.get(
    '/audit/analytics',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Cryptographic Audit Ledger & Security Alerts'],
        summary: 'Ledger Analytics & Anomaly Breakdown',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.userSession || request.user;
      if (user.role !== 'ADMIN' && user.role !== 'HEAD_OF_UNIT') {
        return reply.status(403).send({ error: 'Access restricted to ADMIN or HEAD_OF_UNIT' });
      }

      const analytics = await getAuditLedgerAnalytics();
      return reply.send(analytics);
    }
  );

  // 4. GET /audit/merkle-tree - Interactive Hierarchical Merkle Tree Graph
  fastify.get(
    '/audit/merkle-tree',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Cryptographic Audit Ledger & Security Alerts'],
        summary: 'Interactive Merkle Tree Hierarchy',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.userSession || request.user;
      if (user.role !== 'ADMIN' && user.role !== 'HEAD_OF_UNIT') {
        return reply.status(403).send({ error: 'Access restricted to ADMIN or HEAD_OF_UNIT' });
      }

      const hierarchy = await getMerkleTreeHierarchy();
      return reply.send(hierarchy);
    }
  );

  // 5. Get Security Alerts
  fastify.get(
    '/security/alerts',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Cryptographic Audit Ledger & Security Alerts'],
        summary: 'List Security Scanner Alerts',
        description: 'Retrieves security alerts generated by access rule violations or break-glass activations.',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.userSession || request.user;

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

  // 6. Update Security Alert Status
  fastify.patch(
    '/security/alerts/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Cryptographic Audit Ledger & Security Alerts'],
        summary: 'Update Security Alert Status',
        description: 'Updates the review status of a security alert (e.g. INVESTIGATING, RESOLVED, FALSE_POSITIVE).',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'alert-uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['OPEN', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'],
              example: 'RESOLVED',
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateAlertBody }>, reply: FastifyReply) => {
      const user = request.userSession || request.user;
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

export default auditRoutes;

