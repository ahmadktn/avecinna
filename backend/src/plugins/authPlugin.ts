import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { dbPrimary } from '../db/clientPrimary.js';
import { sessions, users, wards } from '../db/schemaPrimary.js';
import { eq, and, gte } from 'drizzle-orm';

export interface UserSession {
  userId: string;
  username: string;
  role: string;
  homeWardId: string;
  activeWardId: string;
  shiftStart: string;
  shiftEnd: string;
  token: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    userSession: UserSession;
    user: UserSession;
  }
}

export default fp(async function (fastify: FastifyInstance) {
  // 1. Register Fastify JWT plugin with Production Secret Validation
  const defaultSecret = 'avecinna_super_secret_jwt_key_icsc_2026_hackathon';
  const jwtSecret = process.env.JWT_SECRET || defaultSecret;

  if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === defaultSecret)) {
    throw new Error('FATAL SECURITY CONFIGURATION: JWT_SECRET must be set to a secure, unique string in production.');
  } else if (!process.env.JWT_SECRET) {
    fastify.log.warn('⚠️  SECURITY ADVISORY: JWT_SECRET environment variable is unset. Using default development secret.');
  }

  await fastify.register(fastifyJwt, {
    secret: jwtSecret,
  });

  // 2. Register Authentication Decorator
  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      // A. Verify JWT header
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Missing or invalid Authorization header.' });
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded: any = request.server.jwt.verify(token);

      // B. Resolve Active Session from Primary DB
      const now = new Date();
      const sessionRows = await dbPrimary
        .select({
          sessionId: sessions.id,
          userId: sessions.userId,
          activeWardId: sessions.activeWardId,
          shiftStart: sessions.shiftStart,
          shiftEnd: sessions.shiftEnd,
          expiresAt: sessions.expiresAt,
          username: users.username,
          role: users.role,
          homeWardId: users.homeWardId,
          isActive: users.isActive,
        })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(
          and(
            eq(sessions.authToken, token),
            gte(sessions.expiresAt, now)
          )
        )
        .limit(1);

      if (sessionRows.length === 0 || !sessionRows[0].isActive) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Session token has expired, been revoked, or user account is inactive.',
        });
      }

      const s = sessionRows[0];

      const sessionObj = {
        userId: s.userId,
        username: s.username,
        role: s.role,
        homeWardId: s.homeWardId,
        activeWardId: s.activeWardId,
        shiftStart: s.shiftStart.toISOString(),
        shiftEnd: s.shiftEnd.toISOString(),
        token: token,
      };

      // C. Attach UserSession to request object
      request.userSession = sessionObj;
      request.user = sessionObj;

    } catch (err: any) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid session authentication token.',
      });
    }
  });
});
