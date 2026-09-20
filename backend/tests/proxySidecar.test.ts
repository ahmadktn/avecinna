import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import { buildApp } from '../src/app.js';
import { dbAudit } from '../src/db/clientAudit.js';
import { auditBlocks } from '../src/db/schemaAudit.js';
import { eq, and, desc } from 'drizzle-orm';

describe('Phase 6: Mode B Security Reverse Proxy Gateway Sidecar Tests', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let mockUpstreamServer: http.Server;
  let mockUpstreamUrl: string;
  let upstreamHits: Array<{ method: string; url: string; headers: http.IncomingHttpHeaders }> = [];

  let doctorToken: string;
  let nurseToken: string;
  let clerkToken: string;
  let adminToken: string;

  const sampleRawLegacyPatient = {
    id: 'p-cardio-01',
    mrn: 'MRN-CARD-001',
    fullName: 'Chinedu Okafor',
    dateOfBirth: '1980-05-12',
    gender: 'MALE',
    bloodGroup: 'O+',
    genotype: 'AA',
    primaryWardId: 'w-cardio',
    assignedBed: 'Bed-C1',
    allergiesJson: ['Penicillin'],
    emergencySummaryJson: {
      vitals: { bp: '120/80', hr: 72, spo2: 98 },
      allergies: ['Penicillin'],
      activeMedications: [{ name: 'Lisinopril', dose: '10mg' }],
    },
    fullRecordJson: {
      vitals: { bp: '120/80', hr: 72, spo2: 98 },
      activeMedications: [{ name: 'Lisinopril', dose: '10mg' }],
      clinicalNotes: [{ author: 'Dr. Okafor', note: 'Patient shows stable cardiac rhythm post-stent.' }],
      medicalHistory: ['Hypertension diagnosed in 2018'],
    },
  };

  beforeAll(async () => {
    // 1. Spin up Mock Upstream EMR Server (OpenMRS / FHIR simulator)
    await new Promise<void>((resolve) => {
      mockUpstreamServer = http.createServer((req, res) => {
        upstreamHits.push({
          method: req.method || 'GET',
          url: req.url || '/',
          headers: req.headers,
        });

        if (req.url?.includes('patients/p-cardio-01') || req.url?.includes('Patient/p-cardio-01')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(sampleRawLegacyPatient));
        } else if (req.url?.includes('patients/p-peds-01')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ id: 'p-peds-01', fullName: 'Fatima Bello', primaryWardId: 'w-peds' }));
        } else if (req.url === '/v1/system/info') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ emrVersion: 'OpenMRS 2.14.0', status: 'ONLINE' }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'NotFound', message: 'Resource not found on upstream EMR.' }));
        }
      });

      mockUpstreamServer.listen(0, '127.0.0.1', () => {
        const port = (mockUpstreamServer.address() as AddressInfo).port;
        mockUpstreamUrl = `http://127.0.0.1:${port}`;
        process.env.UPSTREAM_EMR_URL = mockUpstreamUrl;
        resolve();
      });
    });

    // 2. Initialize Fastify App with Mode B sidecar registered
    app = await buildApp();

    // 3. Obtain authentication tokens for Doctor, Nurse, Clerk, and Admin
    const docLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: 'dr_cardio', password: 'SecurePassword123!' },
    });
    doctorToken = JSON.parse(docLogin.payload).token;

    const nurseLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: 'nurse_cardio', password: 'SecurePassword123!' },
    });
    nurseToken = JSON.parse(nurseLogin.payload).token;

    const clerkLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: 'clerk', password: 'SecurePassword123!' },
    });
    clerkToken = JSON.parse(clerkLogin.payload).token;

    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: 'admin', password: 'SecurePassword123!' },
    });
    adminToken = JSON.parse(adminLogin.payload).token;
  });

  afterAll(async () => {
    if (mockUpstreamServer) {
      await new Promise<void>((resolve) => mockUpstreamServer.close(() => resolve()));
    }
  });

  it('1. GET /emr-proxy/status should report operational health and upstream configuration', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/emr-proxy/status',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('UP');
    expect(body.executionMode).toBe('MODE_B');
    expect(body.upstreamConfigured).toBe(true);
    expect(body.upstreamUrl).toContain('127.0.0.1');
  });

  it('2. DOCTOR access: Should evaluate CAAC, forward to upstream, return full clinical record, and append MODE_B audit block', async () => {
    const hitsBefore = upstreamHits.length;

    const res = await app.inject({
      method: 'GET',
      url: '/emr-proxy/v1/patients/p-cardio-01',
      headers: { authorization: `Bearer ${doctorToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-avecinna-execution-mode']).toBe('MODE_B');
    expect(res.headers['x-avecinna-audit-logged']).toBe('true');
    expect(res.headers['x-avecinna-relationship-type']).toBe('PRIMARY');

    const body = JSON.parse(res.payload);
    expect(body.id).toBe('p-cardio-01');
    expect(body.clinicalNotes).toBeDefined();
    expect(body.clinicalNotes.length).toBeGreaterThan(0);

    // Verify upstream was contacted
    expect(upstreamHits.length).toBe(hitsBefore + 1);
    expect(upstreamHits[upstreamHits.length - 1].url).toContain('/v1/patients/p-cardio-01');

    // Verify Audit DB contains MODE_B block
    const [latestBlock] = await dbAudit
      .select()
      .from(auditBlocks)
      .where(and(eq(auditBlocks.executionMode, 'MODE_B'), eq(auditBlocks.patientId, 'p-cardio-01')))
      .orderBy(desc(auditBlocks.indexNum))
      .limit(1);

    expect(latestBlock).toBeDefined();
    expect(latestBlock.executionMode).toBe('MODE_B');
    expect(latestBlock.action).toBe('PROXY_GET_SUCCESS');
  });

  it('3. NURSE access: Should intercept upstream response, apply Nurse DTO mask (strip clinical notes), and return safe payload', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/emr-proxy/v1/patients/p-cardio-01',
      headers: { authorization: `Bearer ${nurseToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-avecinna-execution-mode']).toBe('MODE_B');

    const body = JSON.parse(res.payload);
    expect(body.id).toBe('p-cardio-01');
    expect(body.vitals).toBeDefined();
    expect(body.activeMedications).toBeDefined();
    expect(body.allergies).toBeDefined();
    // Sensitive long-term clinical notes MUST be scrubbed for Nurse role
    expect(body.clinicalNotes).toBeUndefined();
    expect(body.medicalHistory).toBeUndefined();
  });

  it('4. CLERK access: Should return demographics and bed assignment ONLY (zero clinical data)', async () => {
    // Clerk switches active ward context to w-cardio
    const switchRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/switch-ward',
      headers: { authorization: `Bearer ${clerkToken}` },
      payload: { targetWardId: 'w-cardio' },
    });
    expect(switchRes.statusCode).toBe(200);

    const res = await app.inject({
      method: 'GET',
      url: '/emr-proxy/v1/patients/p-cardio-01',
      headers: { authorization: `Bearer ${clerkToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-avecinna-execution-mode']).toBe('MODE_B');
    const body = JSON.parse(res.payload);
    expect(body.id).toBe('p-cardio-01');
    expect(body.fullName).toBe('Chinedu Okafor');
    expect(body.assignedBed).toBe('Bed-C1');
    // All clinical fields must be completely absent
    expect(body.vitals).toBeUndefined();
    expect(body.activeMedications).toBeUndefined();
    expect(body.allergies).toBeUndefined();
    expect(body.clinicalNotes).toBeUndefined();
  });

  it('5. SYSTEM ADMIN access: Should strictly redact clinical data with [REDACTED - ADMIN PRIVACY RESTRICTION]', async () => {
    // Admin switches active ward context to w-cardio for administrative audit
    const switchRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/switch-ward',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { targetWardId: 'w-cardio' },
    });
    expect(switchRes.statusCode).toBe(200);

    const res = await app.inject({
      method: 'GET',
      url: '/emr-proxy/v1/patients/p-cardio-01',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-avecinna-execution-mode']).toBe('MODE_B');
    const body = JSON.parse(res.payload);
    expect(body.id).toBe('p-cardio-01');
    expect(body.fullName).toBe('Chinedu Okafor');
    expect(body.allergies).toBe('[REDACTED - ADMIN PRIVACY RESTRICTION]');
    expect(body.vitals).toBe('[REDACTED - ADMIN PRIVACY RESTRICTION]');
    expect(body.activeMedications).toBe('[REDACTED - ADMIN PRIVACY RESTRICTION]');
    expect(body.adminPrivacyNotice).toContain('strictly prohibited from viewing patient clinical data');
  });

  it('6. BOLA Cross-Ward Violation: Cross-ward Doctor attempt MUST be rejected with 403 and NEVER hit upstream', async () => {
    const hitsBefore = upstreamHits.length;

    // Dr. Cardio attempts to access Pediatrics patient p-peds-01
    const res = await app.inject({
      method: 'GET',
      url: '/emr-proxy/v1/patients/p-peds-01',
      headers: { authorization: `Bearer ${doctorToken}` },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe('Forbidden');
    expect(body.message).toContain('NO_WARD_OR_CARE_TEAM_RELATIONSHIP');
    expect(body.executionMode).toBe('MODE_B');

    // CRITICAL: Upstream EMR was NEVER contacted!
    expect(upstreamHits.length).toBe(hitsBefore);

    // Audit DB must contain PROXY_ACCESS_DENIED block
    const [blockedBlock] = await dbAudit
      .select()
      .from(auditBlocks)
      .where(and(eq(auditBlocks.executionMode, 'MODE_B'), eq(auditBlocks.action, 'PROXY_ACCESS_DENIED')))
      .orderBy(desc(auditBlocks.indexNum))
      .limit(1);

    expect(blockedBlock).toBeDefined();
    expect(blockedBlock.patientId).toBe('p-peds-01');
  });

  it('7. Zero Silent Fallbacks: When upstream EMR is unreachable, proxy MUST return 502 Bad Gateway', async () => {
    const savedUpstream = process.env.UPSTREAM_EMR_URL;
    // Set unreachable port
    process.env.UPSTREAM_EMR_URL = 'http://127.0.0.1:59999';

    const res = await app.inject({
      method: 'GET',
      url: '/emr-proxy/v1/patients/p-cardio-01',
      headers: { authorization: `Bearer ${doctorToken}` },
    });

    expect(res.statusCode).toBe(502);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe('Bad Gateway');
    expect(body.message).toContain('Upstream EMR service unreachable');
    expect(body.executionMode).toBe('MODE_B');

    // Restore upstream URL
    process.env.UPSTREAM_EMR_URL = savedUpstream;
  });

  it('8. Unauthenticated requests MUST be rejected with 401 Unauthorized', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/emr-proxy/v1/patients/p-cardio-01',
    });

    expect(res.statusCode).toBe(401);
  });
});
