import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbPrimary } from '../db/clientPrimary.js';
import { careTeams, users, patients, wards } from '../db/schemaPrimary.js';
import { eq, and, desc, or, gte, isNull } from 'drizzle-orm';
import crypto from 'crypto';
import { appendAuditBlock } from '../services/merkleEngine.js';

export async function careTeamsRoutes(fastify: FastifyInstance) {
  // 1. GET /patients/:id/care-teams (List all care team members for a patient)
  fastify.get(
    '/patients/:id/care-teams',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Care Team & Clinical Consultations'],
        summary: 'List Care Team Members for Patient',
        description: 'Retrieves all staff assigned to the care team (Primary, On-Call, Consult) with expiration status.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id: patientId } = request.params;

      const teamList = await dbPrimary
        .select({
          id: careTeams.id,
          patientId: careTeams.patientId,
          staffId: careTeams.staffId,
          staffName: users.fullName,
          staffUsername: users.username,
          staffRole: users.role,
          staffHomeWardId: users.homeWardId,
          relationshipType: careTeams.relationshipType,
          grantedByStaffId: careTeams.grantedByStaffId,
          grantReason: careTeams.grantReason,
          expiresAt: careTeams.expiresAt,
          createdAt: careTeams.createdAt,
        })
        .from(careTeams)
        .leftJoin(users, eq(careTeams.staffId, users.id))
        .where(eq(careTeams.patientId, patientId))
        .orderBy(desc(careTeams.createdAt));

      return reply.send({
        patientId,
        count: teamList.length,
        careTeam: teamList,
      });
    }
  );

  // 2. POST /patients/:id/care-teams (Grant Care Team / Consult Access)
  fastify.post(
    '/patients/:id/care-teams',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Care Team & Clinical Consultations'],
        summary: 'Grant Care Team or Consult Access to Clinician',
        description:
          'Grants temporary or permanent care team access (PRIMARY, ON_CALL, CONSULT), allowing Context-Aware Access Control (CAAC) evaluation to permit access.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['staffId', 'relationshipType'],
          properties: {
            staffId: { type: 'string', example: 'u-doc-cardio' },
            relationshipType: {
              type: 'string',
              enum: ['PRIMARY', 'ON_CALL', 'CONSULT', 'OUTPATIENT_DOCTOR'],
            },
            grantReason: { type: 'string', example: 'Cardiac clearance consult requested' },
            durationHours: { type: 'number', default: 24, example: 24 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          staffId: string;
          relationshipType: 'PRIMARY' | 'ON_CALL' | 'CONSULT' | 'OUTPATIENT_DOCTOR';
          grantReason?: string;
          durationHours?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { id: patientId } = request.params;
      const { staffId, relationshipType, grantReason = 'Clinical consult requested', durationHours = 24 } = request.body;
      const session = request.userSession || request.user;

      // Verify patient exists
      const patientExists = await dbPrimary.select().from(patients).where(eq(patients.id, patientId)).limit(1);
      if (patientExists.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Patient does not exist.' });
      }

      // Verify staff exists
      const staffExists = await dbPrimary.select().from(users).where(eq(users.id, staffId)).limit(1);
      if (staffExists.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Target staff member does not exist.' });
      }

      // Calculate expiration timestamp
      let expiresAt: Date | null = null;
      if (durationHours > 0) {
        expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + durationHours);
      }

      const careTeamId = crypto.randomUUID();

      const [newGrant] = await dbPrimary
        .insert(careTeams)
        .values({
          id: careTeamId,
          patientId,
          staffId,
          relationshipType,
          grantedByStaffId: session.userId,
          grantReason,
          expiresAt,
        })
        .returning();

      // Append audit block to isolated audit DB
      await appendAuditBlock({
        userId: session.userId,
        patientId,
        action: 'CARE_TEAM_GRANT',
        activeWard: session.activeWardId,
        relationshipType,
        payload: {
          careTeamId,
          targetStaffId: staffId,
          relationshipType,
          grantReason,
          expiresAt: expiresAt ? expiresAt.toISOString() : null,
        },
      });

      return reply.status(201).send({
        message: 'Care team access granted successfully.',
        careTeamGrant: newGrant,
      });
    }
  );

  // 3. DELETE /patients/:id/care-teams/:careTeamId (Revoke Care Team / Consult Access)
  fastify.delete(
    '/patients/:id/care-teams/:careTeamId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Care Team & Clinical Consultations'],
        summary: 'Revoke Care Team or Consult Access',
        description: 'Immediately revokes care team access for a clinician and appends an audit block.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            careTeamId: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string; careTeamId: string } }>,
      reply: FastifyReply
    ) => {
      const { id: patientId, careTeamId } = request.params;
      const session = request.userSession || request.user;

      const [deleted] = await dbPrimary
        .delete(careTeams)
        .where(and(eq(careTeams.id, careTeamId), eq(careTeams.patientId, patientId)))
        .returning();

      if (!deleted) {
        return reply.status(404).send({ error: 'Not Found', message: 'Care team grant not found.' });
      }

      // Append audit block
      await appendAuditBlock({
        userId: session.userId,
        patientId,
        action: 'CARE_TEAM_REVOKE',
        activeWard: session.activeWardId,
        payload: {
          careTeamId,
          revokedStaffId: deleted.staffId,
          relationshipType: deleted.relationshipType,
        },
      });

      return reply.send({
        message: 'Care team access revoked successfully.',
        revokedGrant: deleted,
      });
    }
  );

  // 4. GET /care-teams/my-assignments (List all care team assignments for calling clinician)
  fastify.get(
    '/care-teams/my-assignments',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Care Team & Clinical Consultations'],
        summary: 'List Current User Care Team & Consult Assignments',
        description: 'Retrieves all active, non-expired care team assignments for the authenticated staff member.',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = (request as any).userSession || (request as any).user;
      const now = new Date();

      const assignments = await dbPrimary
        .select({
          id: careTeams.id,
          patientId: careTeams.patientId,
          patientName: patients.fullName,
          patientMrn: patients.mrn,
          assignedBed: patients.assignedBed,
          patientWardId: patients.primaryWardId,
          patientWardName: wards.name,
          patientWardCode: wards.code,
          relationshipType: careTeams.relationshipType,
          grantReason: careTeams.grantReason,
          expiresAt: careTeams.expiresAt,
          createdAt: careTeams.createdAt,
        })
        .from(careTeams)
        .innerJoin(patients, eq(careTeams.patientId, patients.id))
        .leftJoin(wards, eq(patients.primaryWardId, wards.id))
        .where(
          and(
            eq(careTeams.staffId, session.userId),
            or(isNull(careTeams.expiresAt), gte(careTeams.expiresAt, now))
          )
        )
        .orderBy(desc(careTeams.createdAt));

      return reply.send({
        count: assignments.length,
        assignments,
      });
    }
  );
}

export default careTeamsRoutes;
