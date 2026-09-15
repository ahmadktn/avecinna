import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbPrimary } from '../db/clientPrimary.js';
import { dbAudit } from '../db/clientAudit.js';
import { sql } from 'drizzle-orm';

export async function healthRoutes(fastify: FastifyInstance) {
  const schemaOpts = {
    schema: {
      tags: ['System Health'],
      summary: 'System & Dual Database Health Check',
      description: 'Checks connectivity to avecinna_primary_db (5432) and isolated avecinna_audit_db (5433).',
    },
  };

  const handler = async (request: FastifyRequest, reply: FastifyReply) => {
    let primaryStatus = 'UNKNOWN';
    let auditStatus = 'UNKNOWN';

    try {
      await dbPrimary.execute(sql`SELECT 1`);
      primaryStatus = 'HEALTHY';
    } catch (err: any) {
      primaryStatus = `UNHEALTHY: ${err.message}`;
    }

    try {
      await dbAudit.execute(sql`SELECT 1`);
      auditStatus = 'HEALTHY';
    } catch (err: any) {
      auditStatus = `UNHEALTHY: ${err.message}`;
    }

    const isHealthy = primaryStatus === 'HEALTHY' && auditStatus === 'HEALTHY';

    return reply.status(isHealthy ? 200 : 503).send({
      status: isHealthy ? 'UP' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      databases: {
        primaryDb: primaryStatus,
        auditDb: auditStatus,
      },
      service: 'avecina-emr-backend',
      version: '1.0.0',
    });
  };

  fastify.get('/health', schemaOpts, handler);
  fastify.get('/api/v1/health', schemaOpts, handler);
}

export default healthRoutes;
