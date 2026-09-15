import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from '../src/app';
import { dbPrimary } from '../src/db/clientPrimary';
import { securityAlerts } from '../src/db/schemaPrimary';
import { eq } from 'drizzle-orm';

describe('Phase 3 Two-Tier Break-Glass & Security Scanner Integration Tests', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let doctorToken: string;

  beforeAll(async () => {
    app = await buildApp();

    // Login as Dr. Cardio via Auth route to create an active DB session
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'dr_cardio',
        password: 'SecurePassword123!',
      },
    });

    const loginBody = JSON.parse(loginRes.payload);
    doctorToken = loginBody.token;
  });

  it('Tier 1: should return redacted emergency summary for out-of-ward patient without justification', async () => {
    // p-peds-01 is in Pediatrics ward, Dr. Cardio is in Cardio ward
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/patients/p-peds-01/break-glass/tier1',
      headers: {
        authorization: `Bearer ${doctorToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.tier).toBe('TIER_1_EMERGENCY_SUMMARY');
    expect(body.emergencySummary).toBeDefined();
    expect(body.emergencySummary.fullName).toBeDefined();
    expect(body.emergencySummary.allergies).toBeDefined();
    // Full record json should NOT be present in Tier 1
    expect(body.emergencySummary.fullRecord).toBeUndefined();
  });

  it('Tier 2: should reject unlock if justificationReason is missing or under 10 characters', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/patients/p-peds-01/break-glass/tier2',
      headers: {
        authorization: `Bearer ${doctorToken}`,
      },
      payload: {
        justificationReason: 'short',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('Tier 2: should unlock full clinical record, append audit block, and create security alert on valid justification', async () => {
    const reason = 'Patient collapsed in ER with acute anaphylaxis requiring immediate full history.';

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/patients/p-peds-01/break-glass/tier2',
      headers: {
        authorization: `Bearer ${doctorToken}`,
      },
      payload: {
        justificationReason: reason,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.tier).toBe('TIER_2_FULL_RECORD_UNLOCKED');
    expect(body.patientRecord).toBeDefined();
    expect(body.patientRecord.id).toBe('p-peds-01');

    // Verify security alert was generated in primary DB
    const alerts = await dbPrimary
      .select()
      .from(securityAlerts)
      .where(eq(securityAlerts.patientId, 'p-peds-01'));

    expect(alerts.length).toBeGreaterThan(0);
    const alert = alerts.find((a) => a.alertType === 'BREAK_GLASS_ACTIVATION');
    expect(alert).toBeDefined();
    expect(alert?.severity).toBe('HIGH');
  });
});
