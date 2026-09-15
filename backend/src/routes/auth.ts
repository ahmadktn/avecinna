import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbPrimary } from '../db/clientPrimary.js';
import { users, sessions, wards } from '../db/schemaPrimary.js';
import { eq, and } from 'drizzle-orm';
import argon2 from 'argon2';
import crypto from 'crypto';
import { appendAuditBlock } from '../services/merkleEngine.js';

export default async function authRoutes(fastify: FastifyInstance) {
  // 1. POST /api/v1/auth/login
  fastify.post('/api/v1/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const body: any = request.body || {};
    const { username, password, deviceId = 'default-workstation' } = body;

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

    // C. Calculate 12-hour shift window & 8-hour session expiration
    const now = new Date();
    const shiftStart = new Date(now);
    shiftStart.setHours(shiftStart.getHours() - 2); // Shift started 2 hours ago

    const shiftEnd = new Date(now);
    shiftEnd.setHours(shiftEnd.getHours() + 10); // Shift ends in 10 hours

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

    const sessionId = `sess-${crypto.randomUUID()}`;

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
  });

  // 2. POST /api/v1/auth/switch-ward (Requires Authentication)
  fastify.post(
    '/api/v1/auth/switch-ward',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body: any = request.body || {};
      const { targetWardId } = body;
      const session = request.userSession;

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
      });

      return reply.send({
        message: 'Active working ward updated successfully.',
        previousWardId,
        activeWard: targetWard,
        auditBlockHash,
      });
    }
  );

  // 3. GET /api/v1/auth/me (Requires Authentication)
  fastify.get(
    '/api/v1/auth/me',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = request.userSession;

      const activeWardRows = await dbPrimary.select().from(wards).where(eq(wards.id, session.activeWardId)).limit(1);
      const activeWard = activeWardRows[0];

      return reply.send({
        user: {
          id: session.userId,
          username: session.username,
          role: session.role,
          homeWardId: session.homeWardId,
        },
        activeWard,
        shiftStart: session.shiftStart,
        shiftEnd: session.shiftEnd,
      });
    }
  );
}
