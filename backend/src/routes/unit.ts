import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbPrimary } from '../db/clientPrimary.js';
import { users, securityAlerts, wards } from '../db/schemaPrimary.js';
import { eq } from 'drizzle-orm';

export default async function unitRoutes(fastify: FastifyInstance) {
  // Middleware: Require HEAD_OF_UNIT or ADMIN role
  const requireHeadOfUnitRole = async (request: FastifyRequest, reply: FastifyReply) => {
    const role = request.userSession?.role;
    if (role !== 'HEAD_OF_UNIT' && role !== 'ADMIN') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Access restricted to Head of Unit / Department Supervisors ONLY.',
      });
    }
  };

  // 1. GET /api/v1/unit/staff (List staff assigned to supervisor's ward)
  fastify.get(
    '/api/v1/unit/staff',
    { preHandler: [fastify.authenticate, requireHeadOfUnitRole] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const wardId = request.userSession.homeWardId;

      const wardStaff = await dbPrimary
        .select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          role: users.role,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.homeWardId, wardId));

      return reply.send({ wardId, staff: wardStaff });
    }
  );

  // 2. GET /api/v1/unit/alerts (List security alerts for unit supervisor)
  fastify.get(
    '/api/v1/unit/alerts',
    { preHandler: [fastify.authenticate, requireHeadOfUnitRole] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const alerts = await dbPrimary.select().from(securityAlerts);
      return reply.send({ alerts });
    }
  );
}
