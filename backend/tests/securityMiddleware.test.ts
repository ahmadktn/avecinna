import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import request from 'supertest';
import Fastify from 'fastify';
import { AvecinnaSDK, filterPatientRecordByRole } from '../../packages/security-sdk/src/index.js';
import { dbAudit } from '../src/db/clientAudit.js';
import { auditBlocks } from '../src/db/schemaAudit.js';
import { eq, and, desc } from 'drizzle-orm';

describe('Phase 6: Mode C Universal Healthcare Developer SDK (@avecina/sdk) Tests', () => {
  const primaryDbUrl =
    process.env.DATABASE_URL_PRIMARY || 'postgres://postgres:postgres@localhost:5432/avecinna_primary_db';
  const auditDbUrl =
    process.env.DATABASE_URL_AUDIT || 'postgres://postgres:postgres@localhost:5432/avecinna_audit_db';

  let sdk: AvecinnaSDK;
  let expressLikeServer: http.Server;
  let fastifyApp: any;

  beforeAll(async () => {
    // 1. Initialize Universal Developer SDK
    sdk = new AvecinnaSDK({
      primaryDbUrl,
      auditDbUrl,
      serviceName: 'radiology-imaging-service',
      executionMode: 'MODE_C',
      enforceCaac: true,
      enforceDtoMasking: true,
    });

    // 2. Setup Express-compatible HTTP Server integrating sdk.express()
    expressLikeServer = http.createServer(async (req: any, res: any) => {
      res.status = function (code: number) {
        res.statusCode = code;
        return res;
      };
      res.json = function (data: any) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
        return res;
      };

      const parsedUrl = new URL(req.url || '/', 'http://localhost');
      const match = parsedUrl.pathname.match(/\/patients\/([^/?#]+)/);
      req.params = { id: match ? match[1] : '' };
      req.query = Object.fromEntries(parsedUrl.searchParams.entries());

      const userId = req.headers['x-user-id'];
      const role = req.headers['x-user-role'];
      const activeWardId = req.headers['x-active-ward-id'];

      if (userId && role && activeWardId) {
        req.user = {
          userId: String(userId),
          role: String(role),
          activeWardId: String(activeWardId),
        };
      }

      const middleware = sdk.express({ patientIdParam: 'id' });
      await middleware(req, res, async (err?: any) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        return await res.json(req.avecina.patient);
      });
    });

    // 3. Setup Fastify application integrating sdk.fastify()
    fastifyApp = Fastify();
    await fastifyApp.register(
      sdk.fastify()
    );

    fastifyApp.get('/patients/:id', async (req: any) => {
      return req.avecina.patient;
    });

    await fastifyApp.ready();
  });

  afterAll(async () => {
    await sdk.close();
  });

  describe('1. Standalone SDK Usage (Framework-Agnostic Core)', () => {
    it('should evaluate CAAC directly via sdk.caac.evaluate', async () => {
      const decision = await sdk.caac.evaluate({
        userId: 'u-doc-cardio',
        role: 'DOCTOR',
        activeWardId: 'w-cardio',
        patientId: 'p-cardio-01',
      });

      expect(decision.isPermitted).toBe(true);
      expect(decision.relationshipType).toBe('PRIMARY');
      expect(decision.patient).toBeDefined();
    });

    it('should reject out-of-ward access directly via sdk.caac.evaluate', async () => {
      const decision = await sdk.caac.evaluate({
        userId: 'u-doc-cardio',
        role: 'DOCTOR',
        activeWardId: 'w-cardio',
        patientId: 'p-peds-01',
      });

      expect(decision.isPermitted).toBe(false);
      expect(decision.denialReason).toContain('NO_WARD_OR_CARE_TEAM_RELATIONSHIP');
    });

    it('should mask patient record directly via sdk.masking.maskPatient', () => {
      const raw = {
        id: 'p-01',
        mrn: 'MRN-01',
        fullName: 'Test Patient',
        dateOfBirth: '1990-01-01',
        gender: 'FEMALE',
        emergencySummaryJson: { vitals: { hr: 75 }, activeMedications: ['Aspirin'] },
        fullRecordJson: { clinicalNotes: ['Confidential note'] },
      };

      const nurseView = sdk.masking.maskPatient(raw, 'NURSE');
      expect(nurseView.vitals).toBeDefined();
      expect(nurseView.clinicalNotes).toBeUndefined();

      const adminView = sdk.masking.maskPatient(raw, 'ADMIN');
      expect(adminView.clinicalNotes).toBe('[REDACTED - ADMIN PRIVACY RESTRICTION]');
    });

    it('should log audit block directly via sdk.audit.log with execution_mode = MODE_C', async () => {
      const receipt = await sdk.audit.log({
        userId: 'u-doc-cardio',
        patientId: 'p-cardio-01',
        action: 'STANDALONE_SDK_ACTION',
        activeWard: 'w-cardio',
        payload: { test: 'standalone_audit_block' },
      });

      expect(receipt.blockHash).toBeDefined();
      expect(receipt.executionMode).toBe('MODE_C');

      const [block] = await dbAudit
        .select()
        .from(auditBlocks)
        .where(eq(auditBlocks.blockHash, receipt.blockHash))
        .limit(1);

      expect(block).toBeDefined();
      expect(block.action).toBe('STANDALONE_SDK_ACTION');
      expect(block.executionMode).toBe('MODE_C');
    });

    it('should cryptographically verify audit ledger chain via sdk.audit.verifyChain', async () => {
      const verification = await sdk.audit.verifyChain();
      expect(verification.valid).toBe(true);
      expect(verification.status).toBe('VERIFIED');
      expect(verification.tamperedBlockIndex).toBeNull();
    });
  });

  describe('2. Express Adapter Integration', () => {
    it('DOCTOR access: Evaluates CAAC, returns full clinical record, and logs MODE_C block', async () => {
      const res = await request(expressLikeServer)
        .get('/patients/p-cardio-01')
        .set('x-user-id', 'u-doc-cardio')
        .set('x-user-role', 'DOCTOR')
        .set('x-active-ward-id', 'w-cardio');

      expect(res.status).toBe(200);
      expect(res.headers['x-avecinna-execution-mode']).toBe('MODE_C');
      expect(res.headers['x-avecinna-audit-logged']).toBe('true');
      expect(res.headers['x-avecinna-relationship-type']).toBe('PRIMARY');

      const body = res.body;
      expect(body.id).toBe('p-cardio-01');
      expect(body.clinicalNotes).toBeDefined();

      const [auditRecord] = await dbAudit
        .select()
        .from(auditBlocks)
        .where(and(eq(auditBlocks.executionMode, 'MODE_C'), eq(auditBlocks.patientId, 'p-cardio-01')))
        .orderBy(desc(auditBlocks.indexNum))
        .limit(1);

      expect(auditRecord).toBeDefined();
      expect(auditRecord.executionMode).toBe('MODE_C');
      expect(auditRecord.userId).toBe('u-doc-cardio');
    });

    it('NURSE access: Applies Nurse DTO mask (stripping clinical notes), returning vitals/meds', async () => {
      const res = await request(expressLikeServer)
        .get('/patients/p-cardio-01')
        .set('x-user-id', 'u-nurse-cardio')
        .set('x-user-role', 'NURSE')
        .set('x-active-ward-id', 'w-cardio');

      expect(res.status).toBe(200);
      expect(res.headers['x-avecinna-execution-mode']).toBe('MODE_C');

      const body = res.body;
      expect(body.id).toBe('p-cardio-01');
      expect(body.vitals).toBeDefined();
      expect(body.activeMedications).toBeDefined();
      expect(body.clinicalNotes).toBeUndefined();
    });

    it('CLERK access: Returns demographics and bed assignment ONLY', async () => {
      const res = await request(expressLikeServer)
        .get('/patients/p-cardio-01')
        .set('x-user-id', 'u-clerk-01')
        .set('x-user-role', 'CLERK')
        .set('x-active-ward-id', 'w-cardio');

      expect(res.status).toBe(200);
      const body = res.body;
      expect(body.id).toBe('p-cardio-01');
      expect(body.fullName).toBeDefined();
      expect(body.assignedBed).toBeDefined();
      expect(body.vitals).toBeUndefined();
      expect(body.clinicalNotes).toBeUndefined();
    });

    it('SYSTEM ADMIN access: Strictly redacts clinical data with [REDACTED - ADMIN PRIVACY RESTRICTION]', async () => {
      const res = await request(expressLikeServer)
        .get('/patients/p-cardio-01')
        .set('x-user-id', 'u-admin-01')
        .set('x-user-role', 'ADMIN')
        .set('x-active-ward-id', 'w-cardio');

      expect(res.status).toBe(200);
      const body = res.body;
      expect(body.id).toBe('p-cardio-01');
      expect(body.allergies).toBe('[REDACTED - ADMIN PRIVACY RESTRICTION]');
      expect(body.vitals).toBe('[REDACTED - ADMIN PRIVACY RESTRICTION]');
      expect(body.adminPrivacyNotice).toContain('strictly prohibited from viewing patient clinical data');
    });

    it('BOLA Cross-Ward Violation: Out-of-ward Doctor request MUST return 403 and log MODE_C_ACCESS_DENIED', async () => {
      const res = await request(expressLikeServer)
        .get('/patients/p-peds-01')
        .set('x-user-id', 'u-doc-cardio')
        .set('x-user-role', 'DOCTOR')
        .set('x-active-ward-id', 'w-cardio');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
      expect(res.body.message).toContain('NO_WARD_OR_CARE_TEAM_RELATIONSHIP');
      expect(res.body.executionMode).toBe('MODE_C');

      const [blockedBlock] = await dbAudit
        .select()
        .from(auditBlocks)
        .where(
          and(
            eq(auditBlocks.executionMode, 'MODE_C'),
            eq(auditBlocks.action, 'MODE_C_ACCESS_DENIED'),
            eq(auditBlocks.patientId, 'p-peds-01')
          )
        )
        .orderBy(desc(auditBlocks.indexNum))
        .limit(1);

      expect(blockedBlock).toBeDefined();
      expect(blockedBlock.userId).toBe('u-doc-cardio');
    });

    it('Unauthenticated requests MUST return 401 Unauthorized', async () => {
      const res = await request(expressLikeServer).get('/patients/p-cardio-01');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });
  });

  describe('3. Fastify Adapter Integration', () => {
    it('Fastify plugin: Evaluates CAAC, applies role DTO mask, and attaches MODE_C headers', async () => {
      const res = await fastifyApp.inject({
        method: 'GET',
        url: '/patients/p-cardio-01',
        headers: {
          'x-user-id': 'u-nurse-cardio',
          'x-user-role': 'NURSE',
          'x-active-ward-id': 'w-cardio',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-avecinna-execution-mode']).toBe('MODE_C');
      expect(res.headers['x-avecinna-audit-logged']).toBe('true');

      const body = JSON.parse(res.payload);
      expect(body.id).toBe('p-cardio-01');
      expect(body.vitals).toBeDefined();
      expect(body.clinicalNotes).toBeUndefined();
    });

    it('Fastify plugin: Rejects cross-ward BOLA access with 403 Forbidden', async () => {
      const res = await fastifyApp.inject({
        method: 'GET',
        url: '/patients/p-peds-01',
        headers: {
          'x-user-id': 'u-doc-cardio',
          'x-user-role': 'DOCTOR',
          'x-active-ward-id': 'w-cardio',
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Forbidden');
      expect(body.message).toContain('NO_WARD_OR_CARE_TEAM_RELATIONSHIP');
      expect(body.executionMode).toBe('MODE_C');
    });
  });

  describe('4. Web Standard Adapter Integration (Next.js / Hono / Edge)', () => {
    it('guards a Web Standard Request and returns secure response with role DTO masking', async () => {
      const webReq = new Request('http://localhost/api/patients/p-cardio-01', {
        method: 'GET',
        headers: {
          'x-user-id': 'u-nurse-cardio',
          'x-user-role': 'NURSE',
          'x-active-ward-id': 'w-cardio',
        },
      });

      const guard = await sdk.guardRequest(webReq);
      expect(guard.isPermitted).toBe(true);
      expect(guard.relationshipType).toBe('PRIMARY');

      const secureRes = await sdk.createSecureResponse(guard.patient, guard.user!.role);
      expect(secureRes.status).toBe(200);
      expect(secureRes.headers.get('X-Avecinna-Execution-Mode')).toBe('MODE_C');

      const data = await secureRes.json();
      expect(data.id).toBe('p-cardio-01');
      expect(data.vitals).toBeDefined();
      expect(data.clinicalNotes).toBeUndefined(); // Masked for nurse
    });

    it('blocks an unauthorized cross-ward Web Standard Request with 403 Response', async () => {
      const webReq = new Request('http://localhost/api/patients/p-peds-01', {
        method: 'GET',
        headers: {
          'x-user-id': 'u-doc-cardio',
          'x-user-role': 'DOCTOR',
          'x-active-ward-id': 'w-cardio',
        },
      });

      const guard = await sdk.guardRequest(webReq);
      expect(guard.isPermitted).toBe(false);
      expect(guard.response).toBeDefined();
      expect(guard.response!.status).toBe(403);

      const errData = await guard.response!.json();
      expect(errData.error).toBe('Forbidden');
      expect(errData.message).toContain('NO_WARD_OR_CARE_TEAM_RELATIONSHIP');
    });
  });
});
