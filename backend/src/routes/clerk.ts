import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbPrimary } from '../db/clientPrimary.js';
import { patients, wards, users, outpatientAppointments } from '../db/schemaPrimary.js';
import { eq, and, or, desc, ilike, sql, gte, lte } from 'drizzle-orm';
import { appendAuditBlock } from '../services/merkleEngine.js';

export async function clerkRoutes(fastify: FastifyInstance) {
  // 1. GET /clerk/overview (Comprehensive Clerk Dashboard Telemetry)
  fastify.get(
    '/clerk/overview',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Clerk Admission & Patient Management'],
        summary: 'Clerk Overview Dashboard Telemetry',
        description: 'Returns real hospital admission stats, today queue count, bed allocation breakdown, and recent registrations.',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const allPatients = await dbPrimary.select().from(patients);
      const allWards = await dbPrimary.select().from(wards);
      const allDoctors = await dbPrimary
        .select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          role: users.role,
          homeWardId: users.homeWardId,
          isActive: users.isActive,
        })
        .from(users)
        .where(or(eq(users.role, 'DOCTOR'), eq(users.role, 'HEAD_OF_UNIT')));

      // Today's Date Range
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todayAppts = await dbPrimary
        .select({
          id: outpatientAppointments.id,
          patientId: outpatientAppointments.patientId,
          patientName: patients.fullName,
          patientMrn: patients.mrn,
          doctorId: outpatientAppointments.doctorId,
          doctorName: users.fullName,
          clinicWardId: outpatientAppointments.clinicWardId,
          wardName: wards.name,
          appointmentDate: outpatientAppointments.appointmentDate,
          status: outpatientAppointments.status,
          notes: outpatientAppointments.notes,
        })
        .from(outpatientAppointments)
        .leftJoin(patients, eq(outpatientAppointments.patientId, patients.id))
        .leftJoin(users, eq(outpatientAppointments.doctorId, users.id))
        .leftJoin(wards, eq(outpatientAppointments.clinicWardId, wards.id))
        .where(
          and(
            gte(outpatientAppointments.appointmentDate, startOfDay),
            lte(outpatientAppointments.appointmentDate, endOfDay)
          )
        )
        .orderBy(desc(outpatientAppointments.appointmentDate));

      const inpatients = allPatients.filter((p) => p.patientType === 'INPATIENT');
      const outpatients = allPatients.filter((p) => p.patientType === 'OUTPATIENT');

      // Ward Bed Census Breakdown
      const wardCensus = allWards.map((w) => {
        const wardInpatients = inpatients.filter((p) => p.primaryWardId === w.id);
        const assignedBeds = wardInpatients.filter((p) => p.assignedBed && p.assignedBed.trim() !== '');
        return {
          id: w.id,
          code: w.code,
          name: w.name,
          department: w.department,
          inpatientCount: wardInpatients.length,
          assignedBedCount: assignedBeds.length,
        };
      });

      // Recent Registrations (Last 6)
      const recentRegistrations = await dbPrimary
        .select({
          id: patients.id,
          mrn: patients.mrn,
          fullName: patients.fullName,
          dateOfBirth: patients.dateOfBirth,
          gender: patients.gender,
          patientType: patients.patientType,
          primaryWardId: patients.primaryWardId,
          assignedBed: patients.assignedBed,
          createdAt: patients.createdAt,
        })
        .from(patients)
        .orderBy(desc(patients.createdAt))
        .limit(6);

      return reply.send({
        metrics: {
          totalPatients: allPatients.length,
          totalInpatients: inpatients.length,
          totalOutpatients: outpatients.length,
          todayAppointmentsCount: todayAppts.length,
          todayPendingConsultations: todayAppts.filter((a) => a.status === 'SCHEDULED').length,
          todayActiveConsultations: todayAppts.filter((a) => a.status === 'IN_CONSULTATION').length,
          todayCompletedConsultations: todayAppts.filter((a) => a.status === 'COMPLETED').length,
          activeDoctorsCount: allDoctors.filter((d) => d.isActive).length,
          totalWardsCount: allWards.length,
        },
        wardCensus,
        todayAppointments: todayAppts,
        recentRegistrations,
      });
    }
  );

  // 2. GET /clerk/doctors (List Active Doctors & HoUs for Consultation Allocation)
  fastify.get(
    '/clerk/doctors',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Clerk Admission & Patient Management'],
        summary: 'List Clinicians Available for Consultation Scheduling',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const activeDoctors = await dbPrimary
        .select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          role: users.role,
          homeWardId: users.homeWardId,
          wardName: wards.name,
          wardCode: wards.code,
        })
        .from(users)
        .leftJoin(wards, eq(users.homeWardId, wards.id))
        .where(
          and(
            eq(users.isActive, true),
            or(eq(users.role, 'DOCTOR'), eq(users.role, 'HEAD_OF_UNIT'))
          )
        );

      return reply.send({ doctors: activeDoctors });
    }
  );

  // 3. GET /clerk/patients (Hospital-Wide Patient Directory for Clerks)
  fastify.get(
    '/clerk/patients',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Clerk Admission & Patient Management'],
        summary: 'Hospital-Wide Patient Directory for Admissions Desk',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', default: 1 },
            limit: { type: 'integer', default: 15 },
            search: { type: 'string' },
            ward: { type: 'string' },
            patientType: { type: 'string', enum: ['ALL', 'INPATIENT', 'OUTPATIENT'] },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: { page?: number; limit?: number; search?: string; ward?: string; patientType?: string };
      }>,
      reply: FastifyReply
    ) => {
      const page = Math.max(1, Number(request.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 15));
      const offset = (page - 1) * limit;
      const { search, ward, patientType } = request.query;

      const conditions: any[] = [];
      if (search && search.trim()) {
        const s = `%${search.trim()}%`;
        conditions.push(or(ilike(patients.fullName, s), ilike(patients.mrn, s)));
      }
      if (ward && ward.trim() && ward !== 'ALL') {
        conditions.push(eq(patients.primaryWardId, ward.trim()));
      }
      if (patientType && patientType !== 'ALL') {
        conditions.push(eq(patients.patientType, patientType as any));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await dbPrimary
        .select({ count: sql<number>`count(*)::int` })
        .from(patients)
        .where(whereClause);

      const total = countResult?.count || 0;

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
          wardName: wards.name,
          wardCode: wards.code,
        })
        .from(patients)
        .leftJoin(wards, eq(patients.primaryWardId, wards.id))
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
          totalPages: Math.ceil(total / limit) || 1,
        },
      });
    }
  );

  // 4. PATCH /clerk/patients/:id/admission (Update Bed Allocation, Ward Transfer, or Patient Type)
  fastify.patch(
    '/clerk/patients/:id/admission',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Clerk Admission & Patient Management'],
        summary: 'Update Patient Bed Allocation & Ward Assignment',
        description: 'Transfers a patient to a new ward, reallocates a bed, or toggles Inpatient/Outpatient admission status.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            primaryWardId: { type: 'string', example: 'w-cardio' },
            assignedBed: { type: 'string', example: 'CARD-BED-14' },
            patientType: { type: 'string', enum: ['INPATIENT', 'OUTPATIENT'] },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const body: any = request.body || {};
      const { primaryWardId, assignedBed, patientType } = body;
      const session = request.userSession || request.user;

      // Role check: Only Clerks, Admins, and Unit Heads can update admissions/bed spaces
      const allowedRoles = ['CLERK', 'ADMIN', 'HEAD_OF_UNIT'];
      if (!allowedRoles.includes(session.role)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Access denied: Only Admissions Clerks and Unit Heads can update patient admissions and bed allocations.',
        });
      }

      const updateData: any = { updatedAt: new Date() };
      if (primaryWardId) updateData.primaryWardId = primaryWardId;
      if (typeof assignedBed !== 'undefined') updateData.assignedBed = assignedBed;
      if (patientType) updateData.patientType = patientType;

      const [updatedPatient] = await dbPrimary
        .update(patients)
        .set(updateData)
        .where(eq(patients.id, id))
        .returning();

      if (!updatedPatient) {
        return reply.status(404).send({ error: 'Not Found', message: 'Patient not found.' });
      }

      await appendAuditBlock({
        userId: session.userId,
        patientId: id,
        action: 'PATIENT_BED_REALLOCATION',
        activeWard: updatedPatient.primaryWardId || session.activeWardId,
        payload: {
          patientId: id,
          newWardId: updatedPatient.primaryWardId,
          assignedBed: updatedPatient.assignedBed,
          patientType: updatedPatient.patientType,
        },
        request,
      });

      return reply.send({
        message: 'Patient admission & bed space updated successfully.',
        patient: updatedPatient,
      });
    }
  );
}

export default clerkRoutes;
