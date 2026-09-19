import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbPrimary } from '../db/clientPrimary.js';
import { users, sessions, wards } from '../db/schemaPrimary.js';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';
import crypto from 'crypto';
import { appendAuditBlock } from '../services/merkleEngine.js';

export async function authRoutes(fastify: FastifyInstance) {
  // 1. POST /auth/login
  fastify.post(
    '/auth/login',
    {
      schema: {
        tags: ['Authentication & Profile'],
        summary: 'Staff User Login',
        description:
          'Authenticates a clinician or staff user using argon2 password hashing, issues a JWT, sets active shift window, and logs a cryptographic audit block.',
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', example: 'dr_cardio' },
            password: { type: 'string', example: 'SecurePassword123!' },
            deviceId: { type: 'string', example: 'workstation-cardio-01' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  username: { type: 'string' },
                  fullName: { type: 'string' },
                  role: { type: 'string' },
                  homeWard: { type: 'object', additionalProperties: true },
                },
              },
              activeWard: { type: 'object', additionalProperties: true },
              shiftEnd: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body: any = request.body || {};
      const { username, password } = body;
      const rawDeviceId = body.deviceId || request.headers['user-agent'] || 'default-workstation';
      const deviceId = String(rawDeviceId).slice(0, 500);

      if (!username || !password) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Username and password are required.' });
      }

      // A. Fetch User from Primary DB
      const userRows = await dbPrimary.select().from(users).where(eq(users.username, username)).limit(1);
      if (userRows.length === 0 || !userRows[0].isActive) {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid username or password.' });
      }

      const user = userRows[0];

      // B. Verify Password Hash using argon2
      const isPasswordValid = await argon2.verify(user.passwordHash, password);
      if (!isPasswordValid) {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid username or password.' });
      }

      // C. Calculate shift window & session expiration
      const now = new Date();
      const shiftStart = new Date(now);
      shiftStart.setHours(shiftStart.getHours() - 2);

      const shiftEnd = new Date(now);
      shiftEnd.setHours(shiftEnd.getHours() + 10);

      const sessionExpiresAt = new Date(now);
      sessionExpiresAt.setHours(sessionExpiresAt.getHours() + 8);

      // D. Fetch Home Ward details
      const homeWardRows = await dbPrimary.select().from(wards).where(eq(wards.id, user.homeWardId)).limit(1);
      const homeWard = homeWardRows[0] || { id: user.homeWardId, code: 'UNKNOWN', name: 'Unknown Ward' };

      // E. Issue JWT & Create Session in Primary DB
      const token = fastify.jwt.sign({
        userId: user.id,
        username: user.username,
        role: user.role,
      });

      const sessionId = crypto.randomUUID();

      await dbPrimary.insert(sessions).values({
        id: sessionId,
        userId: user.id,
        activeWardId: user.homeWardId,
        authToken: token,
        shiftStart,
        shiftEnd,
        ipAddress: request.ip,
        deviceId,
        expiresAt: sessionExpiresAt,
      });

      // F. Append Audit Block to Isolated Audit DB
      await appendAuditBlock({
        userId: user.id,
        action: 'USER_LOGIN_SUCCESS',
        activeWard: user.homeWardId,
        payload: { username: user.username, role: user.role, deviceId },
        request,
      });

      return reply.send({
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          homeWard: homeWard,
        },
        activeWard: homeWard,
        shiftEnd: shiftEnd.toISOString(),
      });
    }
  );

  // 2. POST /auth/switch-ward (Requires Authentication)
  fastify.post(
    '/auth/switch-ward',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Authentication & Profile'],
        summary: 'Switch Active Working Ward Context',
        description:
          'Dynamically updates the clinician working ward context for Context-Aware Access Control (CAAC) evaluation and logs a WARD_SWITCH audit block.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['targetWardId'],
          properties: {
            targetWardId: { type: 'string', example: 'w-cardio' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body: any = request.body || {};
      const { targetWardId } = body;
      const session = request.userSession || request.user;

      if (!targetWardId) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Target ward ID is required.' });
      }

      // A. Verify Target Ward exists
      const targetWardRows = await dbPrimary.select().from(wards).where(eq(wards.id, targetWardId)).limit(1);
      if (targetWardRows.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Target ward does not exist.' });
      }

      const targetWard = targetWardRows[0];
      const previousWardId = session.activeWardId;

      // B. Update Session Active Ward in Primary DB
      await dbPrimary
        .update(sessions)
        .set({ activeWardId: targetWardId })
        .where(eq(sessions.authToken, session.token));

      // C. Append WARD_SWITCH Audit Block to Isolated Audit DB
      const auditBlockHash = await appendAuditBlock({
        userId: session.userId,
        action: 'WARD_SWITCH',
        activeWard: targetWardId,
        payload: {
          previousWardId,
          newWardId: targetWardId,
          newWardCode: targetWard.code,
        },
        request,
      });

      return reply.send({
        message: 'Active working ward updated successfully.',
        previousWardId,
        activeWard: targetWard,
        auditBlockHash,
      });
    }
  );

  // 3. GET /auth/me (Requires Authentication)
  fastify.get(
    '/auth/me',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Authentication & Profile'],
        summary: 'Get Current Authenticated Session & Profile',
        description: 'Returns the currently active user profile, assigned role, active ward, and shift details.',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = request.userSession || request.user;

      const activeWardRows = await dbPrimary.select().from(wards).where(eq(wards.id, session.activeWardId)).limit(1);
      const activeWard = activeWardRows[0];

      const userRows = await dbPrimary.select().from(users).where(eq(users.id, session.userId)).limit(1);
      const user = userRows[0];

      return reply.send({
        user: {
          id: session.userId,
          username: session.username,
          fullName: user ? user.fullName : session.username,
          role: session.role,
          homeWardId: session.homeWardId,
        },
        activeWard,
        shiftStart: session.shiftStart,
        shiftEnd: session.shiftEnd,
      });
    }
  );

  // 4. PATCH /auth/profile (Requires Authentication - Self Profile Update)
  fastify.patch(
    '/auth/profile',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Authentication & Profile'],
        summary: 'Update Current User Profile',
        description: 'Allows authenticated users to update their own full name or change their account password.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            fullName: { type: 'string', example: 'Dr. Emeka Okafor' },
            newPassword: { type: 'string', example: 'NewStrongPassword123!' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = request.userSession || request.user;
      const body: any = request.body || {};
      const { fullName, newPassword } = body;

      const updateData: any = { updatedAt: new Date() };

      if (fullName) {
        updateData.fullName = fullName;
      }
      if (newPassword) {
        updateData.passwordHash = await argon2.hash(newPassword);
      }

      if (Object.keys(updateData).length <= 1) {
        return reply.status(400).send({ error: 'Bad Request', message: 'At least one field (fullName or newPassword) must be provided.' });
      }

      const [updatedUser] = await dbPrimary
        .update(users)
        .set(updateData)
        .where(eq(users.id, session.userId))
        .returning();

      await appendAuditBlock({
        userId: session.userId,
        action: 'USER_PROFILE_UPDATE',
        activeWard: session.activeWardId,
        payload: { updatedFields: Object.keys(updateData) },
        request,
      });

      return reply.send({
        message: 'Profile updated successfully.',
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          fullName: updatedUser.fullName,
          role: updatedUser.role,
          homeWardId: updatedUser.homeWardId,
        },
      });
    }
  );
}

export default authRoutes;
