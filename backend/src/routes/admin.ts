import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbPrimary } from '../db/clientPrimary.js';
import { users, wards } from '../db/schemaPrimary.js';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';
import crypto from 'crypto';
import { appendAuditBlock } from '../services/merkleEngine.js';

export default async function adminRoutes(fastify: FastifyInstance) {
  // Middleware: Require ADMIN role
  const requireAdminRole = async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.userSession?.role !== 'ADMIN') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Access restricted to System Administrators ONLY.',
      });
    }
  };

  // 1. GET /api/v1/admin/users (List all hospital staff accounts)
  fastify.get(
    '/api/v1/admin/users',
    { preHandler: [fastify.authenticate, requireAdminRole] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const staffList = await dbPrimary
        .select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          role: users.role,
          homeWardId: users.homeWardId,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users);

      return reply.send({ users: staffList });
    }
  );

  // 2. POST /api/v1/admin/users (Create a new staff user account)
  fastify.post(
    '/api/v1/admin/users',
    { preHandler: [fastify.authenticate, requireAdminRole] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body: any = request.body || {};
      const { username, password, fullName, role, homeWardId } = body;

      if (!username || !password || !fullName || !role || !homeWardId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'username, password, fullName, role, and homeWardId are required.',
        });
      }

      // Verify ward exists
      const wardExists = await dbPrimary.select().from(wards).where(eq(wards.id, homeWardId)).limit(1);
      if (wardExists.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Specified home ward does not exist.' });
      }

      const passwordHash = await argon2.hash(password);
      const newUserId = `u-${crypto.randomUUID()}`;

      await dbPrimary.insert(users).values({
        id: newUserId,
        username,
        passwordHash,
        fullName,
        role,
        homeWardId,
        isActive: true,
      });

      // Audit User Creation in Isolated Audit DB
      await appendAuditBlock({
        userId: request.userSession.userId,
        action: 'ADMIN_USER_CREATE',
        activeWard: request.userSession.activeWardId,
        payload: { newUserId, username, role, homeWardId },
      });

      return reply.status(201).send({
        message: 'User account created successfully.',
        user: { id: newUserId, username, fullName, role, homeWardId },
      });
    }
  );

  // 3. GET /api/v1/admin/wards (List all hospital wards)
  fastify.get(
    '/api/v1/admin/wards',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const allWards = await dbPrimary.select().from(wards);
      return reply.send({ wards: allWards });
    }
  );
}
