import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from '../src/app';

describe('Clerk Role Workflow & Outpatient Queue Integration Tests', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let clerkToken: string;
  let doctorToken: string;

  beforeAll(async () => {
    app = await buildApp();

    // Login as Clerk
    const clerkLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'clerk',
        password: 'SecurePassword123!',
      },
    });
    clerkToken = JSON.parse(clerkLogin.payload).token;

    // Login as Doctor
    const docLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'dr_cardio',
        password: 'SecurePassword123!',
      },
    });
    doctorToken = JSON.parse(docLogin.payload).token;
  });

  it('1. GET /api/v1/clerk/overview returns real hospital admissions telemetry', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/clerk/overview',
      headers: { authorization: `Bearer ${clerkToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.metrics).toBeDefined();
    expect(body.metrics.totalPatients).toBeGreaterThan(0);
    expect(body.wardCensus).toBeDefined();
    expect(Array.isArray(body.wardCensus)).toBe(true);
  });

  it('2. GET /api/v1/clerk/patients returns paginated patient directory with filters', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/clerk/patients?page=1&limit=10&patientType=INPATIENT',
      headers: { authorization: `Bearer ${clerkToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.patients).toBeDefined();
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(10);
  });

  it('3. POST /api/v1/appointments books an outpatient consultation slot', async () => {
    // Book an appointment for today
    const now = new Date().toISOString();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/appointments',
      headers: { authorization: `Bearer ${clerkToken}` },
      payload: {
        patientId: 'p-cardio-01',
        doctorId: 'u-doc-cardio',
        clinicWardId: 'w-cardio',
        appointmentDate: now,
        notes: 'Pre-surgery consultation',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.appointment).toBeDefined();
    expect(body.appointment.status).toBe('SCHEDULED');

    // Update appointment status to IN_CONSULTATION
    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/appointments/${body.appointment.id}/status`,
      headers: { authorization: `Bearer ${clerkToken}` },
      payload: {
        status: 'IN_CONSULTATION',
      },
    });

    expect(updateRes.statusCode).toBe(200);
    const updateBody = JSON.parse(updateRes.payload);
    expect(updateBody.appointment.status).toBe('IN_CONSULTATION');
  });

  it('4. PATCH /api/v1/clerk/patients/:id/admission reallocates inpatient bed space', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/clerk/patients/p-cardio-01/admission',
      headers: { authorization: `Bearer ${clerkToken}` },
      payload: {
        primaryWardId: 'w-cardio',
        assignedBed: 'CARD-BED-99',
        patientType: 'INPATIENT',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.patient.assignedBed).toBe('CARD-BED-99');
  });
});
