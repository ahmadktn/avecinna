import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from '../src/app';

describe('System Health Check API Integration Tests', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
  });

  it('GET /health should return 200 OK and check database connections', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('UP');
    expect(body.databases).toBeDefined();
    expect(body.databases.primaryDb).toBe('HEALTHY');
    expect(body.databases.auditDb).toBe('HEALTHY');
  });

  it('GET /api/v1/health should return 200 OK', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('UP');
  });
});
