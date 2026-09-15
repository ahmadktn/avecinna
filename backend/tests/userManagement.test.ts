import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from '../src/app';

describe('User Management & Profile Update Integration Tests', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let adminToken: string;
  let doctorToken: string;

  beforeAll(async () => {
    app = await buildApp();

    const adminLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'admin',
        password: 'SecurePassword123!',
      },
    });

    const adminLoginBody = JSON.parse(adminLoginRes.payload);
    adminToken = adminLoginBody.token;

    const docLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'dr_cardio',
        password: 'SecurePassword123!',
      },
    });

    const docLoginBody = JSON.parse(docLoginRes.payload);
    doctorToken = docLoginBody.token;
  });

  it('ADMIN can list all staff accounts', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body.users)).toBe(true);
    expect(body.users.length).toBeGreaterThan(0);
  });

  it('Non-Admin (DOCTOR) is forbidden from calling admin user management endpoints', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users',
      headers: { authorization: `Bearer ${doctorToken}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it('ADMIN can create a new staff account', async () => {
    const newUsername = `test_nurse_${Date.now()}`;
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/users',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        username: newUsername,
        password: 'Password123!',
        fullName: 'Test Nurse Account',
        role: 'NURSE',
        homeWardId: 'w-cardio',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.user).toBeDefined();
    expect(body.user.username).toBe(newUsername);
  });

  it('Clinician can self update profile full name', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/auth/profile',
      headers: { authorization: `Bearer ${doctorToken}` },
      payload: {
        fullName: 'Dr. Emeka Okafor (Updated)',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.user.fullName).toBe('Dr. Emeka Okafor (Updated)');
  });
});
