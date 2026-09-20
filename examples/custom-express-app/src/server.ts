import express from 'express';
import dotenv from 'dotenv';
import { AvecinnaSDK } from '../../../packages/security-sdk/src/index.js';

dotenv.config();

const app = express();
app.use(express.json());

const primaryDbUrl =
  process.env.DATABASE_URL_PRIMARY || 'postgres://postgres:postgres@localhost:5432/avecinna_primary_db';
const auditDbUrl =
  process.env.DATABASE_URL_AUDIT || 'postgres://postgres:postgres@localhost:5432/avecinna_audit_db';

// 1. Initialize Avecinna Universal Developer SDK
const avecinna = new AvecinnaSDK({
  primaryDbUrl,
  auditDbUrl,
  serviceName: 'radiology-imaging-service',
  executionMode: 'MODE_C',
  enforceCaac: true,
  enforceDtoMasking: true,
});

// 2. Third-party Authentication Mock Middleware (simulating verified hospital gateway headers)
app.use((req: any, _res, next) => {
  const userId = (req.headers['x-user-id'] as string) || 'u-doc-cardio';
  const role = (req.headers['x-user-role'] as string) || 'DOCTOR';
  const activeWardId = (req.headers['x-active-ward-id'] as string) || 'w-cardio';

  req.user = {
    userId,
    role,
    activeWardId,
  };
  next();
});

// 3. Clinical Endpoint Protected via Express Adapter
app.get('/api/v1/patients/:id', avecinna.express({ patientIdParam: 'id' }), (req: any, res) => {
  // Access verified by CAAC; outgoing payload will be role-masked by Avecinna DTO filter!
  const patient = req.avecina.patient;
  return res.json({
    message: 'Patient imaging chart retrieved successfully.',
    patient,
    relationshipType: req.avecina.caacResult.relationshipType,
  });
});

// 4. Mutation Endpoint Protected with Custom Action Identifier
app.post(
  '/api/v1/patients/:id/imaging-studies',
  avecinna.express({ action: 'ORDER_IMAGING_STUDY' }),
  (req: any, res) => {
    return res.status(201).json({
      message: 'Imaging study ordered successfully.',
      studyId: 'img-stud-9092',
      patientId: req.params.id,
    });
  }
);

// 5. Standalone SDK Usage Example: Direct Audit Verification Endpoint
app.get('/api/v1/audit/status', async (_req, res) => {
  const verification = await avecinna.audit.verifyChain();
  return res.json(verification);
});

export { app, avecinna };

if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 5050;
  app.listen(port, () => {
    console.log(`🏥 Mode C Sample Express Clinical Service running at http://localhost:${port}`);
  });
}
