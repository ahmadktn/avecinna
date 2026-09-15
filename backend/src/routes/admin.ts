import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbPrimary } from '../db/clientPrimary.js';
import { users, wards } from '../db/schemaPrimary.js';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';
import crypto from 'crypto';
import { appendAuditBlock } from '../services/merkleEngine.js';

export async function adminRoutes(fastify: FastifyInstance) {
  // Middleware: Require ADMIN role
  const requireAdminRole = async (request: FastifyRequest, reply: FastifyReply) => {
    const session = request.userSession || request.user;
    if (!session || session.role !== 'ADMIN') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Access restricted to System Administrators ONLY.',
      });
    }
  };

  // 1. GET /admin/users (List all hospital staff accounts)
  fastify.get(
    '/admin/users',
    {
      preHandler: [fastify.authenticate, requireAdminRole],
      schema: {
        tags: ['User & Ward Administration'],
        summary: 'List All Staff User Accounts',
        description: 'Retrieves all hospital staff accounts along with role and home ward metadata. Restrict to ADMIN.',
        security: [{ bearerAuth: [] }],
      },
    },
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
          updatedAt: users.updatedAt,
        })
        .from(users);

      return reply.send({ users: staffList });
    }
  );

  // 2. POST /admin/users (Create a new staff user account)
  fastify.post(
    '/admin/users',
    {
      preHandler: [fastify.authenticate, requireAdminRole],
      schema: {
        tags: ['User & Ward Administration'],
        summary: 'Create Staff User Account',
        description: 'Creates a new clinician or staff user account with assigned role and home ward.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['username', 'password', 'fullName', 'role', 'homeWardId'],
          properties: {
            username: { type: 'string', example: 'dr_surgeon' },
            password: { type: 'string', example: 'SecurePass123!' },
            fullName: { type: 'string', example: 'Dr. Chidi Nnamdi' },
            role: {
              type: 'string',
              enum: ['DOCTOR', 'NURSE', 'PARAMEDIC', 'CLERK', 'PHARMACIST', 'HEAD_OF_UNIT', 'ADMIN'],
            },
            homeWardId: { type: 'string', example: 'w-cardio' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body: any = request.body || {};
      const { username, password, fullName, role, homeWardId } = body;
      const session = request.userSession || request.user;

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
        userId: session.userId,
        action: 'ADMIN_USER_CREATE',
        activeWard: session.activeWardId,
        payload: { newUserId, username, role, homeWardId },
      });

      return reply.status(201).send({
        message: 'User account created successfully.',
        user: { id: newUserId, username, fullName, role, homeWardId, isActive: true },
      });
    }
  );

  // 3. GET /admin/users/:id (Get single user account)
  fastify.get(
    '/admin/users/:id',
    {
      preHandler: [fastify.authenticate, requireAdminRole],
      schema: {
        tags: ['User & Ward Administration'],
        summary: 'Get User Account Details',
        description: 'Retrieves details for a specific user account by ID.',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const userRows = await dbPrimary.select().from(users).where(eq(users.id, id)).limit(1);

      if (userRows.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'User account not found.' });
      }

      const u = userRows[0];
      return reply.send({
        user: {
          id: u.id,
          username: u.username,
          fullName: u.fullName,
          role: u.role,
          homeWardId: u.homeWardId,
          isActive: u.isActive,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        },
      });
    }
  );

  // 4. PUT /admin/users/:id (Update staff user account details)
  fastify.put(
    '/admin/users/:id',
    {
      preHandler: [fastify.authenticate, requireAdminRole],
      schema: {
        tags: ['User & Ward Administration'],
        summary: 'Update Staff User Account',
        description: 'Edits user account attributes including full name, role, home ward, active status, or password.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            fullName: { type: 'string' },
            role: {
              type: 'string',
              enum: ['DOCTOR', 'NURSE', 'PARAMEDIC', 'CLERK', 'PHARMACIST', 'HEAD_OF_UNIT', 'ADMIN'],
            },
            homeWardId: { type: 'string' },
            isActive: { type: 'boolean' },
            password: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const body: any = request.body || {};
      const { fullName, role, homeWardId, isActive, password } = body;
      const session = request.userSession || request.user;

      const updateData: any = { updatedAt: new Date() };

      if (fullName) updateData.fullName = fullName;
      if (role) updateData.role = role;
      if (homeWardId) updateData.homeWardId = homeWardId;
      if (typeof isActive === 'boolean') updateData.isActive = isActive;
      if (password) updateData.passwordHash = await argon2.hash(password);

      const [updatedUser] = await dbPrimary
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();

      if (!updatedUser) {
        return reply.status(404).send({ error: 'Not Found', message: 'User account not found.' });
      }

      await appendAuditBlock({
        userId: session.userId,
        action: 'ADMIN_USER_UPDATE',
        activeWard: session.activeWardId,
        payload: { targetUserId: id, updatedFields: Object.keys(updateData) },
      });

      return reply.send({
        message: 'User account updated successfully.',
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          fullName: updatedUser.fullName,
          role: updatedUser.role,
          homeWardId: updatedUser.homeWardId,
          isActive: updatedUser.isActive,
        },
      });
    }
  );

  // 5. PATCH /admin/users/:id/status (Toggle user active status)
  fastify.patch(
    '/admin/users/:id/status',
    {
      preHandler: [fastify.authenticate, requireAdminRole],
      schema: {
        tags: ['User & Ward Administration'],
        summary: 'Toggle User Account Active Status',
        description: 'Activates or deactivates a hospital staff account.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['isActive'],
          properties: {
            isActive: { type: 'boolean' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const { isActive } = request.body as any;
      const session = request.userSession || request.user;

      const [updatedUser] = await dbPrimary
        .update(users)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();

      if (!updatedUser) {
        return reply.status(404).send({ error: 'Not Found', message: 'User account not found.' });
      }

      await appendAuditBlock({
        userId: session.userId,
        action: 'ADMIN_USER_STATUS_TOGGLE',
        activeWard: session.activeWardId,
        payload: { targetUserId: id, isActive },
      });

      return reply.send({
        message: `User account ${isActive ? 'activated' : 'deactivated'} successfully.`,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          isActive: updatedUser.isActive,
        },
      });
    }
  );

  // 6. GET /admin/wards (List all hospital wards)
  fastify.get(
    '/admin/wards',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['User & Ward Administration'],
        summary: 'List All Hospital Wards',
        description: 'Retrieves all registered hospital wards and departments.',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const allWards = await dbPrimary.select().from(wards);
      return reply.send({ wards: allWards });
    }
  );

  // 7. POST /admin/wards (Create new hospital ward)
  fastify.post(
    '/admin/wards',
    {
      preHandler: [fastify.authenticate, requireAdminRole],
      schema: {
        tags: ['User & Ward Administration'],
        summary: 'Create New Hospital Ward',
        description: 'Registers a new hospital ward or department.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['code', 'name', 'department'],
          properties: {
            code: { type: 'string', example: 'ONCOL' },
            name: { type: 'string', example: 'Oncology Ward' },
            department: { type: 'string', example: 'Cancer Treatment' },
            headOfUnitId: { type: 'string', example: 'u-hou-cardio' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body: any = request.body || {};
      const { code, name, department, headOfUnitId } = body;
      const session = request.userSession || request.user;

      if (!code || !name || !department) {
        return reply.status(400).send({ error: 'Bad Request', message: 'code, name, and department are required.' });
      }

      const wardId = `w-${code.toLowerCase()}`;
      const [newWard] = await dbPrimary
        .insert(wards)
        .values({
          id: wardId,
          code: code.toUpperCase(),
          name,
          department,
          headOfUnitId: headOfUnitId || null,
        })
        .returning();

      await appendAuditBlock({
        userId: session.userId,
        action: 'ADMIN_WARD_CREATE',
        activeWard: session.activeWardId,
        payload: { wardId, code, name },
      });

      return reply.status(201).send({ message: 'Ward created successfully.', ward: newWard });
    }
  );
}

export default adminRoutes;
