import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbPrimary } from '../db/clientPrimary.js';
import { users, securityAlerts, wards, patients, outpatientAppointments, wardRosters } from '../db/schemaPrimary.js';
import { eq, and, or, desc, ilike, sql, gte, lte } from 'drizzle-orm';
import crypto from 'crypto';
import { appendAuditBlock } from '../services/merkleEngine.js';

export async function unitRoutes(fastify: FastifyInstance) {
  // 0. Ensure ward_rosters table exists and has seed data if empty
  try {
    await dbPrimary.execute(sql`
      CREATE TABLE IF NOT EXISTS ward_rosters (
        id VARCHAR(36) PRIMARY KEY,
        ward_id VARCHAR(36) NOT NULL REFERENCES wards(id),
        staff_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        shift_type VARCHAR(20) NOT NULL DEFAULT 'DAY',
        shift_date VARCHAR(15) NOT NULL,
        start_time VARCHAR(10) NOT NULL DEFAULT '08:00',
        end_time VARCHAR(10) NOT NULL DEFAULT '20:00',
        status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
        notes TEXT,
        assigned_by VARCHAR(36) REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ward_rosters_ward ON ward_rosters(ward_id, shift_date);
      CREATE INDEX IF NOT EXISTS idx_ward_rosters_staff ON ward_rosters(staff_id, shift_date);
    `);

    // Check if empty, verify ward and users exist before seeding initial roster
    const [existing] = await dbPrimary.select({ count: sql<number>`count(*)::int` }).from(wardRosters);
    if (!existing || existing.count === 0) {
      const [ward] = await dbPrimary.select().from(wards).limit(1);
      if (ward) {
        const staffList = await dbPrimary.select().from(users).where(eq(users.homeWardId, ward.id)).limit(4);
        if (staffList.length > 0) {
          const today = new Date().toISOString().slice(0, 10);
          const supervisor = staffList.find((u) => u.role === 'HEAD_OF_UNIT') || staffList[0];
          const initialShifts = staffList.map((s, idx) => ({
            id: crypto.randomUUID(),
            wardId: ward.id,
            staffId: s.id,
            shiftType: idx === 0 ? 'DAY' : idx === 1 ? 'DAY' : 'ON_CALL',
            shiftDate: today,
            startTime: '08:00',
            endTime: '20:00',
            status: 'ON_DUTY',
            notes: `${s.fullName} - ${s.role}`,
            assignedBy: supervisor.id,
          }));

          for (const s of initialShifts) {
            await dbPrimary.insert(wardRosters).values(s);
          }
        }
      }
    }
  } catch (initErr) {
    fastify.log.warn({ err: initErr }, 'Ward rosters table verification skipped or initialized.');
  }

  // Middleware: Require HEAD_OF_UNIT or ADMIN role
  const requireHeadOfUnitRole = async (request: FastifyRequest, reply: FastifyReply) => {
    const session = (request as any).userSession || (request as any).user;
    const role = session?.role;
    if (role !== 'HEAD_OF_UNIT' && role !== 'ADMIN') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Access restricted to Head of Unit / Department Supervisors ONLY.',
      });
    }
  };

  // 1. GET /unit/overview (Comprehensive Head of Unit Ward Telemetry)
  fastify.get(
    '/unit/overview',
    {
      preHandler: [fastify.authenticate, requireHeadOfUnitRole],
      schema: {
        tags: ['Head of Unit Supervision'],
        summary: 'Head of Unit Dashboard Overview Telemetry',
        description: 'Returns real ward census, acuity breakdown, duty roster summary, and active security alerts.',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = (request as any).userSession || (request as any).user;
      const wardId = session.activeWardId || session.homeWardId;

      // Ward info
      const [ward] = await dbPrimary.select().from(wards).where(eq(wards.id, wardId)).limit(1);

      // Inpatients in this ward
      const wardPatients = await dbPrimary
        .select({
          id: patients.id,
          mrn: patients.mrn,
          fullName: patients.fullName,
          gender: patients.gender,
          dateOfBirth: patients.dateOfBirth,
          assignedBed: patients.assignedBed,
          patientType: patients.patientType,
          fullRecordJson: patients.fullRecordJson,
          emergencySummaryJson: patients.emergencySummaryJson,
          createdAt: patients.createdAt,
        })
        .from(patients)
        .where(eq(patients.primaryWardId, wardId));

      // Acuity calculation
      let criticalCount = 0;
      let monitoringCount = 0;
      let stableCount = 0;

      const formattedPatients = wardPatients.map((p) => {
        const vitals = (p.fullRecordJson as any)?.vitals || (p.emergencySummaryJson as any)?.vitals || {};
        const hr = Number(vitals.hr) || 72;
        const spo2 = Number(vitals.spo2) || 98;
        let acuity: 'stable' | 'monitoring' | 'critical' = 'stable';

        if (hr > 120 || spo2 < 90) {
          criticalCount++;
          acuity = 'critical';
        } else if (hr > 100 || spo2 < 95) {
          monitoringCount++;
          acuity = 'monitoring';
        } else {
          stableCount++;
          acuity = 'stable';
        }

        return {
          id: p.id,
          mrn: p.mrn,
          fullName: p.fullName,
          gender: p.gender,
          dateOfBirth: p.dateOfBirth,
          assignedBed: p.assignedBed || 'Bed 01',
          acuity,
          vitals,
          diagnosis: (p.fullRecordJson as any)?.diagnosis || 'Clinical Inpatient Surveillance',
        };
      });

      // Staff assigned to this ward
      const assignedStaff = await dbPrimary
        .select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          role: users.role,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.homeWardId, wardId));

      // Today's Date String
      const todayStr = new Date().toISOString().slice(0, 10);

      // On-duty rosters for today
      const todayRosters = await dbPrimary
        .select({
          id: wardRosters.id,
          staffId: wardRosters.staffId,
          staffName: users.fullName,
          staffRole: users.role,
          shiftType: wardRosters.shiftType,
          shiftDate: wardRosters.shiftDate,
          startTime: wardRosters.startTime,
          endTime: wardRosters.endTime,
          status: wardRosters.status,
          notes: wardRosters.notes,
        })
        .from(wardRosters)
        .leftJoin(users, eq(wardRosters.staffId, users.id))
        .where(and(eq(wardRosters.wardId, wardId), eq(wardRosters.shiftDate, todayStr)))
        .orderBy(desc(wardRosters.createdAt));

      const onDutyCount = todayRosters.filter((r) => r.status === 'ON_DUTY').length;

      // Outpatient appointments today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const [apptCountResult] = await dbPrimary
        .select({ count: sql<number>`count(*)::int` })
        .from(outpatientAppointments)
        .where(
          and(
            eq(outpatientAppointments.clinicWardId, wardId),
            gte(outpatientAppointments.appointmentDate, startOfDay),
            lte(outpatientAppointments.appointmentDate, endOfDay)
          )
        );

      const todayApptsCount = apptCountResult?.count || 0;

      // Security alerts
      const alerts = await dbPrimary
        .select()
        .from(securityAlerts)
        .orderBy(desc(securityAlerts.createdAt))
        .limit(6);

      const openAlertsCount = alerts.filter((a) => a.status === 'OPEN').length;

      return reply.send({
        ward: ward || { id: wardId, code: 'WARD', name: 'Supervised Unit', department: 'Clinical Service' },
        metrics: {
          totalWardInpatients: wardPatients.length,
          totalAssignedStaff: assignedStaff.length,
          onDutyStaffCount: onDutyCount || assignedStaff.filter((s) => s.isActive).length,
          todayAppointmentsCount: todayApptsCount,
          activeSecurityAlertsCount: openAlertsCount,
          criticalCount,
          monitoringCount,
          stableCount,
          bedOccupancyRate: Math.min(100, Math.round((wardPatients.length / Math.max(1, 15)) * 100)),
        },
        onDutyStaff: todayRosters.length > 0 ? todayRosters : assignedStaff.map((s) => ({
          id: s.id,
          staffId: s.id,
          staffName: s.fullName,
          staffRole: s.role,
          shiftType: 'DAY',
          shiftDate: todayStr,
          startTime: '08:00',
          endTime: '20:00',
          status: s.isActive ? 'ON_DUTY' : 'SCHEDULED',
          notes: 'Assigned to ward unit',
        })),
        recentAlerts: alerts,
        wardPatients: formattedPatients.slice(0, 8),
      });
    }
  );

  // 2. GET /unit/staff (Paginated & Filtered Staff List for Supervisor)
  fastify.get(
    '/unit/staff',
    {
      preHandler: [fastify.authenticate, requireHeadOfUnitRole],
      schema: {
        tags: ['Head of Unit Supervision'],
        summary: 'List Ward Staff with Filtering & Pagination',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', default: 1 },
            limit: { type: 'integer', default: 10 },
            role: { type: 'string' },
            status: { type: 'string' },
            search: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = (request as any).userSession || (request as any).user;
      const wardId = session.activeWardId || session.homeWardId;
      const query = (request.query || {}) as any;

      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
      const offset = (page - 1) * limit;
      const { role, status, search } = query;

      const conditions: any[] = [eq(users.homeWardId, wardId)];

      if (role && role !== 'ALL') {
        conditions.push(eq(users.role, role as any));
      }

      if (status && status !== 'ALL') {
        if (status === 'ACTIVE') conditions.push(eq(users.isActive, true));
        if (status === 'INACTIVE') conditions.push(eq(users.isActive, false));
      }

      if (search && search.trim()) {
        const s = `%${search.trim()}%`;
        conditions.push(or(ilike(users.fullName, s), ilike(users.username, s)));
      }

      const whereClause = and(...conditions);

      const [countResult] = await dbPrimary
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(whereClause);

      const total = countResult?.count || 0;

      const staffList = await dbPrimary
        .select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          role: users.role,
          isActive: users.isActive,
          homeWardId: users.homeWardId,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      return reply.send({
        wardId,
        staff: staffList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      });
    }
  );

  // 3. PATCH /unit/staff/:id/status (Suspend / Restore Staff Account in Unit)
  fastify.patch(
    '/unit/staff/:id/status',
    {
      preHandler: [fastify.authenticate, requireHeadOfUnitRole],
      schema: {
        tags: ['Head of Unit Supervision'],
        summary: 'Toggle Staff Active Status in Unit',
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
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as any;
      const body = (request.body || {}) as any;
      const { id } = params;
      const { isActive } = body;
      const session = (request as any).userSession || (request as any).user;
      const wardId = session.activeWardId || session.homeWardId;

      const [updatedUser] = await dbPrimary
        .update(users)
        .set({ isActive, updatedAt: new Date() })
        .where(and(eq(users.id, id), eq(users.homeWardId, wardId)))
        .returning({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          role: users.role,
          isActive: users.isActive,
        });

      if (!updatedUser) {
        return reply.status(404).send({ error: 'Not Found', message: 'Staff member not found in your unit.' });
      }

      await appendAuditBlock({
        userId: session.userId,
        action: 'STAFF_STATUS_UPDATE',
        activeWard: wardId,
        payload: { targetUserId: id, newStatus: isActive ? 'ACTIVE' : 'SUSPENDED' },
        request,
      });

      return reply.send({
        message: `Staff member account ${isActive ? 'restored' : 'suspended'} successfully.`,
        staff: updatedUser,
      });
    }
  );

  // 3.5 GET /unit/staff/candidates (Search hospital clinicians to reassign to unit)
  fastify.get(
    '/unit/staff/candidates',
    {
      preHandler: [fastify.authenticate, requireHeadOfUnitRole],
      schema: {
        tags: ['Head of Unit Supervision'],
        summary: 'Search Hospital Clinicians Available for Ward Reassignment',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            search: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = (request as any).userSession || (request as any).user;
      const wardId = session.activeWardId || session.homeWardId;
      const query = (request.query || {}) as any;
      const search = query.search?.trim();

      const conditions: any[] = [
        eq(users.isActive, true),
      ];

      if (search) {
        const s = `%${search}%`;
        conditions.push(or(ilike(users.fullName, s), ilike(users.username, s)));
      }

      const candidateUsers = await dbPrimary
        .select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          role: users.role,
          isActive: users.isActive,
          homeWardId: users.homeWardId,
          wardName: wards.name,
          wardCode: wards.code,
        })
        .from(users)
        .leftJoin(wards, eq(users.homeWardId, wards.id))
        .where(and(...conditions))
        .orderBy(users.fullName)
        .limit(30);

      // Map whether they are already in this ward
      const candidates = candidateUsers.map((u) => ({
        ...u,
        isCurrentWard: u.homeWardId === wardId,
      }));

      return reply.send({ candidates });
    }
  );

  // 5. POST /unit/staff/reassign (Reassign staff member to this unit)
  fastify.post(
    '/unit/staff/reassign',
    {
      preHandler: [fastify.authenticate, requireHeadOfUnitRole],
      schema: {
        tags: ['Head of Unit Supervision'],
        summary: 'Reassign Staff Member to Unit',
        description: 'Transfers a staff member from another ward into this unit supervisor\'s ward.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['staffId'],
          properties: {
            staffId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { staffId } = request.body as any;
      const session = (request as any).userSession || (request as any).user;
      const targetWardId = session.activeWardId || session.homeWardId;

      const [updatedUser] = await dbPrimary
        .update(users)
        .set({ homeWardId: targetWardId, updatedAt: new Date() })
        .where(eq(users.id, staffId))
        .returning();

      if (!updatedUser) {
        return reply.status(404).send({ error: 'Not Found', message: 'Staff member not found.' });
      }

      await appendAuditBlock({
        userId: session.userId,
        action: 'STAFF_WARD_REASSIGN',
        activeWard: targetWardId,
        payload: { staffId, newWardId: targetWardId },
        request,
      });

      return reply.send({
        message: 'Staff reassigned to unit successfully.',
        staff: updatedUser,
      });
    }
  );

  // 5. GET /unit/roster (Paginated & Filtered Duty Rosters)
  fastify.get(
    '/unit/roster',
    {
      preHandler: [fastify.authenticate, requireHeadOfUnitRole],
      schema: {
        tags: ['Head of Unit Supervision'],
        summary: 'List Ward Duty Roster with Filters & Pagination',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', default: 1 },
            limit: { type: 'integer', default: 15 },
            shiftType: { type: 'string' },
            status: { type: 'string' },
            date: { type: 'string' },
            search: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = (request as any).userSession || (request as any).user;
      const wardId = session.activeWardId || session.homeWardId;
      const query = (request.query || {}) as any;

      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(query.limit) || 15));
      const offset = (page - 1) * limit;
      const { shiftType, status, date, search } = query;

      const conditions: any[] = [eq(wardRosters.wardId, wardId)];

      if (shiftType && shiftType !== 'ALL') {
        conditions.push(eq(wardRosters.shiftType, shiftType));
      }

      if (status && status !== 'ALL') {
        conditions.push(eq(wardRosters.status, status));
      }

      if (date && date.trim()) {
        conditions.push(eq(wardRosters.shiftDate, date.trim()));
      }

      const whereClause = and(...conditions);

      const rawRosters = await dbPrimary
        .select({
          id: wardRosters.id,
          wardId: wardRosters.wardId,
          staffId: wardRosters.staffId,
          staffName: users.fullName,
          staffUsername: users.username,
          staffRole: users.role,
          shiftType: wardRosters.shiftType,
          shiftDate: wardRosters.shiftDate,
          startTime: wardRosters.startTime,
          endTime: wardRosters.endTime,
          status: wardRosters.status,
          notes: wardRosters.notes,
          createdAt: wardRosters.createdAt,
        })
        .from(wardRosters)
        .leftJoin(users, eq(wardRosters.staffId, users.id))
        .where(whereClause)
        .orderBy(desc(wardRosters.shiftDate), desc(wardRosters.createdAt));

      let filtered = rawRosters;
      if (search && search.trim()) {
        const s = search.toLowerCase().trim();
        filtered = filtered.filter(
          (r) =>
            (r.staffName && r.staffName.toLowerCase().includes(s)) ||
            (r.staffUsername && r.staffUsername.toLowerCase().includes(s)) ||
            (r.notes && r.notes.toLowerCase().includes(s))
        );
      }

      const total = filtered.length;
      const paginated = filtered.slice(offset, offset + limit);

      const onDutyCount = rawRosters.filter((r) => r.status === 'ON_DUTY').length;
      const scheduledCount = rawRosters.filter((r) => r.status === 'SCHEDULED').length;
      const completedCount = rawRosters.filter((r) => r.status === 'COMPLETED').length;

      return reply.send({
        wardId,
        rosters: paginated,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
        summary: {
          totalShifts: rawRosters.length,
          onDutyCount,
          scheduledCount,
          completedCount,
        },
      });
    }
  );

  // 6. POST /unit/roster (Assign New Duty Shift)
  fastify.post(
    '/unit/roster',
    {
      preHandler: [fastify.authenticate, requireHeadOfUnitRole],
      schema: {
        tags: ['Head of Unit Supervision'],
        summary: 'Assign Duty Shift to Ward Clinician',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['staffId', 'shiftDate'],
          properties: {
            staffId: { type: 'string' },
            shiftType: { type: 'string', default: 'DAY' },
            shiftDate: { type: 'string', example: '2026-03-04' },
            startTime: { type: 'string', default: '08:00' },
            endTime: { type: 'string', default: '20:00' },
            notes: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = (request as any).userSession || (request as any).user;
      const wardId = session.activeWardId || session.homeWardId;
      const body: any = request.body || {};

      const newRosterId = crypto.randomUUID();
      const [created] = await dbPrimary
        .insert(wardRosters)
        .values({
          id: newRosterId,
          wardId,
          staffId: body.staffId,
          shiftType: body.shiftType || 'DAY',
          shiftDate: body.shiftDate,
          startTime: body.startTime || '08:00',
          endTime: body.endTime || '20:00',
          status: 'SCHEDULED',
          notes: body.notes || 'Scheduled ward coverage',
          assignedBy: session.userId,
        })
        .returning();

      await appendAuditBlock({
        userId: session.userId,
        action: 'STAFF_ROSTER_ASSIGNED',
        activeWard: wardId,
        payload: {
          rosterId: newRosterId,
          staffId: body.staffId,
          shiftType: body.shiftType,
          shiftDate: body.shiftDate,
        },
        request,
      });

      return reply.status(201).send({
        message: 'Duty shift assigned successfully.',
        roster: created,
      });
    }
  );

  // 7. PATCH /unit/roster/:id/status (Update Shift Status)
  fastify.patch(
    '/unit/roster/:id/status',
    {
      preHandler: [fastify.authenticate, requireHeadOfUnitRole],
      schema: {
        tags: ['Head of Unit Supervision'],
        summary: 'Update Duty Shift Status',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['SCHEDULED', 'ACTIVE', 'COMPLETED', 'ABSENT', 'SWAPPED'] },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const { status } = request.body as any;
      const session = (request as any).userSession || (request as any).user;
      const wardId = session.activeWardId || session.homeWardId;

      const [updated] = await dbPrimary
        .update(wardRosters)
        .set({ status, updatedAt: new Date() })
        .where(and(eq(wardRosters.id, id), eq(wardRosters.wardId, wardId)))
        .returning();

      if (!updated) {
        return reply.status(404).send({ error: 'Not Found', message: 'Roster entry not found in your unit.' });
      }

      await appendAuditBlock({
        userId: session.userId,
        action: 'STAFF_ROSTER_STATUS_UPDATE',
        activeWard: wardId,
        payload: { rosterId: id, newStatus: status },
        request,
      });

      return reply.send({
        message: 'Roster status updated successfully.',
        roster: updated,
      });
    }
  );

  // 8. DELETE /unit/roster/:id (Delete / Cancel Duty Shift)
  fastify.delete(
    '/unit/roster/:id',
    {
      preHandler: [fastify.authenticate, requireHeadOfUnitRole],
      schema: {
        tags: ['Head of Unit Supervision'],
        summary: 'Cancel Duty Shift Assignment',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const session = (request as any).userSession || (request as any).user;
      const wardId = session.activeWardId || session.homeWardId;

      const [deleted] = await dbPrimary
        .delete(wardRosters)
        .where(and(eq(wardRosters.id, id), eq(wardRosters.wardId, wardId)))
        .returning();

      if (!deleted) {
        return reply.status(404).send({ error: 'Not Found', message: 'Roster entry not found in your unit.' });
      }

      await appendAuditBlock({
        userId: session.userId,
        action: 'STAFF_ROSTER_DELETED',
        activeWard: wardId,
        payload: { rosterId: id, staffId: deleted.staffId, shiftDate: deleted.shiftDate },
        request,
      });

      return reply.send({
        message: 'Shift assignment cancelled successfully.',
        roster: deleted,
      });
    }
  );

  // 9. GET /unit/alerts (List security alerts for unit supervisor)
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
      const alerts = await dbPrimary
        .select()
        .from(securityAlerts)
        .orderBy(desc(securityAlerts.createdAt));
      return reply.send({ alerts });
    }
  );

  // 10. PATCH /unit/alerts/:id/resolve (Resolve / Acknowledge Security Alert)
  fastify.patch(
    '/unit/alerts/:id/resolve',
    {
      preHandler: [fastify.authenticate, requireHeadOfUnitRole],
      schema: {
        tags: ['Head of Unit Supervision'],
        summary: 'Resolve Security Alert',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const session = (request as any).userSession || (request as any).user;
      const wardId = session.activeWardId || session.homeWardId;

      const [updated] = await dbPrimary
        .update(securityAlerts)
        .set({ status: 'RESOLVED' })
        .where(eq(securityAlerts.id, id))
        .returning();

      if (!updated) {
        return reply.status(404).send({ error: 'Not Found', message: 'Alert not found.' });
      }

      await appendAuditBlock({
        userId: session.userId,
        action: 'SECURITY_ALERT_RESOLVED',
        activeWard: wardId,
        payload: { alertId: id },
        request,
      });

      return reply.send({
        message: 'Security alert acknowledged and resolved.',
        alert: updated,
      });
    }
  );
}

export default unitRoutes;
