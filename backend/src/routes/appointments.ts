import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbPrimary } from '../db/clientPrimary.js';
import { outpatientAppointments, patients, users, wards } from '../db/schemaPrimary.js';
import { eq, and, desc, gte, lte, or, ilike, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { appendAuditBlock } from '../services/merkleEngine.js';

export async function appointmentsRoutes(fastify: FastifyInstance) {
  // 1. GET /appointments (List appointments with filters & pagination)
  fastify.get(
    '/appointments',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Outpatient Appointments & Clinic Scheduling'],
        summary: 'List Outpatient Consultation Appointments',
        description: 'Retrieves consultation queue with status, doctor, ward, and date filtering.',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', default: 1 },
            limit: { type: 'integer', default: 20 },
            status: { type: 'string' },
            date: { type: 'string', example: '2026-03-03' },
            doctorId: { type: 'string' },
            wardId: { type: 'string' },
            search: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          page?: number;
          limit?: number;
          status?: string;
          date?: string;
          doctorId?: string;
          wardId?: string;
          search?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const page = Math.max(1, Number(request.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 20));
      const offset = (page - 1) * limit;
      const { status, date, doctorId, wardId, search } = request.query;

      const conditions: any[] = [];

      if (status && status !== 'all' && status !== 'ALL') {
        conditions.push(eq(outpatientAppointments.status, status as any));
      }

      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        conditions.push(
          and(
            gte(outpatientAppointments.appointmentDate, startOfDay),
            lte(outpatientAppointments.appointmentDate, endOfDay)
          )
        );
      }

      if (doctorId && doctorId !== 'all') {
        conditions.push(eq(outpatientAppointments.doctorId, doctorId));
      }

      if (wardId && wardId !== 'all') {
        conditions.push(eq(outpatientAppointments.clinicWardId, wardId));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Join appointments with patient, doctor, and ward
      const rawAppointments = await dbPrimary
        .select({
          id: outpatientAppointments.id,
          patientId: outpatientAppointments.patientId,
          patientName: patients.fullName,
          patientMrn: patients.mrn,
          patientGender: patients.gender,
          doctorId: outpatientAppointments.doctorId,
          doctorName: users.fullName,
          doctorUsername: users.username,
          clinicWardId: outpatientAppointments.clinicWardId,
          wardName: wards.name,
          wardCode: wards.code,
          appointmentDate: outpatientAppointments.appointmentDate,
          status: outpatientAppointments.status,
          notes: outpatientAppointments.notes,
          createdAt: outpatientAppointments.createdAt,
        })
        .from(outpatientAppointments)
        .leftJoin(patients, eq(outpatientAppointments.patientId, patients.id))
        .leftJoin(users, eq(outpatientAppointments.doctorId, users.id))
        .leftJoin(wards, eq(outpatientAppointments.clinicWardId, wards.id))
        .where(whereClause)
        .orderBy(desc(outpatientAppointments.appointmentDate));

      // Optional in-memory search on patientName/MRN/doctorName if search string provided
      let filtered = rawAppointments;
      if (search && search.trim()) {
        const s = search.toLowerCase().trim();
        filtered = filtered.filter(
          (a) =>
            (a.patientName && a.patientName.toLowerCase().includes(s)) ||
            (a.patientMrn && a.patientMrn.toLowerCase().includes(s)) ||
            (a.doctorName && a.doctorName.toLowerCase().includes(s))
        );
      }

      const total = filtered.length;
      const paginated = filtered.slice(offset, offset + limit);

      return reply.send({
        appointments: paginated,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      });
    }
  );

  // 2. POST /appointments (Create / Book new outpatient consultation appointment)
  fastify.post(
    '/appointments',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Outpatient Appointments & Clinic Scheduling'],
        summary: 'Schedule Outpatient Consultation',
        description:
          'Books a new consultation appointment, granting temporary outpatient CAAC access to the attending doctor.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['patientId', 'doctorId', 'clinicWardId', 'appointmentDate'],
          properties: {
            patientId: { type: 'string', example: 'p-cardio-01' },
            doctorId: { type: 'string', example: 'u-doc-cardio' },
            clinicWardId: { type: 'string', example: 'w-cardio' },
            appointmentDate: { type: 'string', example: '2026-03-03T10:00:00.000Z' },
            notes: { type: 'string', example: 'Routine follow-up consultation' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = request.userSession || request.user;
      const body: any = request.body || {};
      const { patientId, doctorId, clinicWardId, appointmentDate, notes = '' } = body;

      if (!patientId || !doctorId || !clinicWardId || !appointmentDate) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'patientId, doctorId, clinicWardId, and appointmentDate are required.',
        });
      }

      // Verify patient exists
      const patientExists = await dbPrimary.select().from(patients).where(eq(patients.id, patientId)).limit(1);
      if (patientExists.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Specified patient does not exist.' });
      }

      // Verify doctor exists
      const doctorExists = await dbPrimary.select().from(users).where(eq(users.id, doctorId)).limit(1);
      if (doctorExists.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Specified doctor does not exist.' });
      }

      // Verify ward exists
      const wardExists = await dbPrimary.select().from(wards).where(eq(wards.id, clinicWardId)).limit(1);
      if (wardExists.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Specified ward does not exist.' });
      }

      const appointmentId = crypto.randomUUID();

      const [newAppointment] = await dbPrimary
        .insert(outpatientAppointments)
        .values({
          id: appointmentId,
          patientId,
          doctorId,
          clinicWardId,
          appointmentDate: new Date(appointmentDate),
          status: 'SCHEDULED',
          notes,
        })
        .returning();

      // Append audit block
      await appendAuditBlock({
        userId: session.userId,
        patientId,
        action: 'APPOINTMENT_CREATE',
        activeWard: clinicWardId,
        payload: {
          appointmentId,
          doctorId,
          patientId,
          clinicWardId,
          appointmentDate,
        },
        request,
      });

      return reply.status(201).send({
        message: 'Consultation appointment scheduled successfully.',
        appointment: newAppointment,
      });
    }
  );

  // 4. PATCH /appointments/:id/status (Doctor / Clerk Updates Appointment Status)
  fastify.patch(
    '/appointments/:id/status',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Outpatient Appointments & Encounters'],
        summary: 'Update Appointment Status',
        description: 'Allows a doctor or clerk to mark an appointment as IN_CONSULTATION, COMPLETED, NO_SHOW, or CANCELLED.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['SCHEDULED', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const { status } = request.body as any;
      const session = (request as any).userSession || (request as any).user;

      const updateData: any = { status, updatedAt: new Date() };

      const [updated] = await dbPrimary
        .update(outpatientAppointments)
        .set(updateData)
        .where(eq(outpatientAppointments.id, id))
        .returning();

      if (!updated) {
        return reply.status(404).send({ error: 'Not Found', message: 'Appointment not found.' });
      }

      // Append audit block
      await appendAuditBlock({
        userId: session.userId,
        patientId: updated.patientId,
        action: 'APPOINTMENT_STATUS_UPDATE',
        activeWard: updated.clinicWardId,
        payload: {
          appointmentId: id,
          newStatus: status,
        },
        request,
      });

      return reply.send({
        message: 'Appointment status updated successfully.',
        appointment: updated,
      });
    }
  );
}

export default appointmentsRoutes;
