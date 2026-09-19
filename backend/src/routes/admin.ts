import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbPrimary } from '../db/clientPrimary.js';
import { dbAudit } from '../db/clientAudit.js';
import { users, wards, patients, securityAlerts } from '../db/schemaPrimary.js';
import { auditBlocks } from '../db/schemaAudit.js';
import { eq, desc, ilike, or, and, sql } from 'drizzle-orm';
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

  // 8. PUT /admin/wards/:id (Update hospital ward details & assign Head of Unit)
  fastify.put(
    '/admin/wards/:id',
    {
      preHandler: [fastify.authenticate, requireAdminRole],
      schema: {
        tags: ['User & Ward Administration'],
        summary: 'Update Hospital Ward',
        description: 'Updates ward name, department, or assigns a Head of Unit clinician.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            department: { type: 'string' },
            headOfUnitId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const body: any = request.body || {};
      const { name, department, headOfUnitId } = body;
      const session = request.userSession || request.user;

      const updateData: any = {};
      if (name) updateData.name = name;
      if (department) updateData.department = department;
      if (typeof headOfUnitId !== 'undefined') updateData.headOfUnitId = headOfUnitId || null;

      const [updatedWard] = await dbPrimary
        .update(wards)
        .set(updateData)
        .where(eq(wards.id, id))
        .returning();

      if (!updatedWard) {
        return reply.status(404).send({ error: 'Not Found', message: 'Hospital ward not found.' });
      }

      await appendAuditBlock({
        userId: session.userId,
        action: 'ADMIN_WARD_UPDATE',
        activeWard: session.activeWardId,
        payload: { wardId: id, updateData },
      });

      return reply.send({ message: 'Ward updated successfully.', ward: updatedWard });
    }
  );

  // 9. POST /admin/wards/:id/assign-staff (Assign staff member to a ward)
  fastify.post(
    '/admin/wards/:id/assign-staff',
    {
      preHandler: [fastify.authenticate, requireAdminRole],
      schema: {
        tags: ['User & Ward Administration'],
        summary: 'Assign Staff Member to Ward',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id: targetWardId } = request.params;
      const { userId } = request.body as any;
      const session = request.userSession || request.user;

      const wardExists = await dbPrimary.select().from(wards).where(eq(wards.id, targetWardId)).limit(1);
      if (wardExists.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Ward not found.' });
      }

      const [updatedUser] = await dbPrimary
        .update(users)
        .set({ homeWardId: targetWardId, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        return reply.status(404).send({ error: 'Not Found', message: 'User not found.' });
      }

      await appendAuditBlock({
        userId: session.userId,
        action: 'ADMIN_STAFF_WARD_ASSIGN',
        activeWard: session.activeWardId,
        payload: { targetUserId: userId, newWardId: targetWardId },
      });

      return reply.send({ message: 'Staff member assigned to ward successfully.', user: updatedUser });
    }
  );

  // 10. GET /admin/overview (Comprehensive System Overview Telemetry)
  fastify.get(
    '/admin/overview',
    {
      preHandler: [fastify.authenticate, requireAdminRole],
      schema: {
        tags: ['User & Ward Administration'],
        summary: 'System Overview Dashboard Telemetry',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const allPatients = await dbPrimary.select().from(patients);
      const allWards = await dbPrimary.select().from(wards);
      const allUsers = await dbPrimary.select().from(users);
      const allAlerts = await dbPrimary.select().from(securityAlerts);
      const recentBlocks = await dbAudit
        .select()
        .from(auditBlocks)
        .orderBy(desc(auditBlocks.indexNum))
        .limit(10);

      const [totalAuditBlocksCount] = await dbAudit
        .select({ count: sql<number>`count(*)::int` })
        .from(auditBlocks);

      // Aggregate breakdown by roles
      const roleBreakdown: Record<string, number> = {};
      for (const u of allUsers) {
        roleBreakdown[u.role] = (roleBreakdown[u.role] || 0) + 1;
      }

      // Aggregate breakdown by ward patient census
      const wardCensus: Record<string, number> = {};
      for (const p of allPatients) {
        const wId = p.primaryWardId || 'Unassigned';
        wardCensus[wId] = (wardCensus[wId] || 0) + 1;
      }

      const wardsWithCensus = allWards.map((w) => ({
        id: w.id,
        code: w.code,
        name: w.name,
        department: w.department,
        headOfUnitId: w.headOfUnitId,
        patientCount: wardCensus[w.id] || 0,
        staffCount: allUsers.filter((u) => u.homeWardId === w.id).length,
      }));

      return reply.send({
        metrics: {
          totalPatients: allPatients.length,
          totalWards: allWards.length,
          totalStaff: allUsers.length,
          activeStaff: allUsers.filter((u) => u.isActive).length,
          totalAuditBlocks: totalAuditBlocksCount?.count || 0,
          openSecurityAlerts: allAlerts.filter((a) => a.status === 'OPEN').length,
          totalSecurityAlerts: allAlerts.length,
        },
        roleBreakdown,
        wardsWithCensus,
        recentAuditLogs: recentBlocks,
      });
    }
  );

  // 11. GET /admin/patients (Admin Hospital-Wide Patient Directory with Pagination & Filter)
  fastify.get(
    '/admin/patients',
    {
      preHandler: [fastify.authenticate, requireAdminRole],
      schema: {
        tags: ['User & Ward Administration'],
        summary: 'Admin Hospital-Wide Patient List (Demographics Only - OWASP API3 Redacted)',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', default: 1 },
            limit: { type: 'integer', default: 15 },
            search: { type: 'string' },
            ward: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: { page?: number; limit?: number; search?: string; ward?: string };
      }>,
      reply: FastifyReply
    ) => {
      const page = Math.max(1, Number(request.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 15));
      const offset = (page - 1) * limit;
      const { search, ward } = request.query;

      const conditions: any[] = [];
      if (search && search.trim()) {
        const s = `%${search.trim()}%`;
        conditions.push(or(ilike(patients.fullName, s), ilike(patients.mrn, s)));
      }
      if (ward && ward.trim() && ward !== 'ALL') {
        conditions.push(eq(patients.primaryWardId, ward.trim()));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await dbPrimary
        .select({ count: sql<number>`count(*)::int` })
        .from(patients)
        .where(whereClause);

      const total = countResult?.count || 0;

      // Note: As per HIPAA & OWASP API3 Admin Redaction, fullRecordJson & emergencySummaryJson clinical fields are omitted
      const patientList = await dbPrimary
        .select({
          id: patients.id,
          mrn: patients.mrn,
          fullName: patients.fullName,
          dateOfBirth: patients.dateOfBirth,
          gender: patients.gender,
          patientType: patients.patientType,
          genotype: patients.genotype,
          bloodGroup: patients.bloodGroup,
          primaryWardId: patients.primaryWardId,
          assignedBed: patients.assignedBed,
          createdAt: patients.createdAt,
        })
        .from(patients)
        .where(whereClause)
        .orderBy(desc(patients.createdAt))
        .limit(limit)
        .offset(offset);

      return reply.send({
        patients: patientList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }
  );

  // 12. GET /admin/reports/export (Export Compliance & Audit Reports)
  fastify.get(
    '/admin/reports/export',
    {
      preHandler: [fastify.authenticate, requireAdminRole],
      schema: {
        tags: ['User & Ward Administration'],
        summary: 'Export System Audit & Compliance Reports',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            format: { type: 'string', enum: ['json', 'csv', 'proof'] },
            type: { type: 'string', enum: ['audit_ledger', 'staff_access', 'security_alerts', 'ward_census'] },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: { format?: string; type?: string } }>,
      reply: FastifyReply
    ) => {
      const format = request.query.format || 'json';
      const reportType = request.query.type || 'audit_ledger';

      if (reportType === 'audit_ledger') {
        const blocks = await dbAudit.select().from(auditBlocks).orderBy(desc(auditBlocks.indexNum));
        if (format === 'csv') {
          const headers = 'Index,BlockHash,PrevHash,UserId,PatientId,Action,ActiveWard,PayloadHash,Timestamp\n';
          const rows = blocks
            .map(
              (b) =>
                `"${b.indexNum}","${b.blockHash}","${b.prevHash}","${b.userId}","${b.patientId || ''}","${b.action}","${b.activeWard}","${b.payloadHash}","${b.createdAt.toISOString()}"`
            )
            .join('\n');
          reply.header('Content-Type', 'text/csv');
          reply.header('Content-Disposition', 'attachment; filename="avecinna_audit_ledger.csv"');
          return reply.send(headers + rows);
        }
        return reply.send({ reportType, totalRecords: blocks.length, generatedAt: new Date().toISOString(), data: blocks });
      }

      if (reportType === 'security_alerts') {
        const alerts = await dbPrimary.select().from(securityAlerts).orderBy(desc(securityAlerts.createdAt));
        if (format === 'csv') {
          const headers = 'Id,AlertType,Severity,UserId,PatientId,Status,Description,CreatedAt\n';
          const rows = alerts
            .map(
              (a) =>
                `"${a.id}","${a.alertType}","${a.severity}","${a.userId || ''}","${a.patientId || ''}","${a.status}","${a.description.replace(/"/g, '""')}","${a.createdAt.toISOString()}"`
            )
            .join('\n');
          reply.header('Content-Type', 'text/csv');
          reply.header('Content-Disposition', 'attachment; filename="avecinna_security_alerts.csv"');
          return reply.send(headers + rows);
        }
        return reply.send({ reportType, totalRecords: alerts.length, generatedAt: new Date().toISOString(), data: alerts });
      }

      // Default ward census report
      const allWards = await dbPrimary.select().from(wards);
      const allPatients = await dbPrimary.select().from(patients);
      const censusData = allWards.map((w) => ({
        wardId: w.id,
        code: w.code,
        name: w.name,
        department: w.department,
        inpatientCount: allPatients.filter((p) => p.primaryWardId === w.id).length,
      }));

      return reply.send({
        reportType: 'ward_census',
        totalWards: allWards.length,
        generatedAt: new Date().toISOString(),
        data: censusData,
      });
    }
  );
}

export default adminRoutes;

