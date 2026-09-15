import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbPrimary } from '../db/clientPrimary.js';
import { users, securityAlerts, wards } from '../db/schemaPrimary.js';
import { eq } from 'drizzle-orm';

export async function unitRoutes(fastify: FastifyInstance) {
  // Middleware: Require HEAD_OF_UNIT or ADMIN role
  const requireHeadOfUnitRole = async (request: FastifyRequest, reply: FastifyReply) => {
    const session = request.userSession || request.user;
    const role = session?.role;
    if (role !== 'HEAD_OF_UNIT' && role !== 'ADMIN') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Access restricted to Head of Unit / Department Supervisors ONLY.',
      });
    }
  };

  // 1. GET /unit/staff (List staff assigned to supervisor's ward)
  fastify.get(
    '/unit/staff',
    {
      preHandler: [fastify.authenticate, requireHeadOfUnitRole],
      schema: {
        tags: ['Head of Unit Supervision'],
        summary: 'List Ward Staff Roster',
        description: 'Retrieves all active and inactive staff accounts assigned to the Head of Unit home ward.',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = request.userSession || request.user;
      const wardId = session.homeWardId;

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

  // 2. GET /unit/alerts (List security alerts for unit supervisor)
  fastify.get(
    '/unit/alerts',
    {
      preHandler: [fastify.authenticate, requireHeadOfUnitRole],
      schema: {
        tags: ['Head of Unit Supervision'],
        summary: 'List Ward Security Scanner Alerts',
        description: 'Retrieves security scanner alerts generated for unit staff access anomalies or break-glass triggers.',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const alerts = await dbPrimary.select().from(securityAlerts);
      return reply.send({ alerts });
    }
  );
}

export default unitRoutes;
