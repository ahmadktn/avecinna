import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbPrimary } from '../db/clientPrimary.js';
import { medicalDocuments, labResults, patients } from '../db/schemaPrimary.js';
import { eq, desc } from 'drizzle-orm';
import { evaluateCAAC } from '../services/caacEngine.js';
import { appendAuditBlock } from '../services/merkleEngine.js';
import crypto from 'crypto';

interface DocumentUploadBody {
  documentType: string;
  title: string;
  fileContentBase64: string;
  fileUrl?: string;
}

interface LabResultBody {
  testName: string;
  category: string;
  resultDataJson: Record<string, any>;
  attachmentBase64?: string;
  status?: 'PENDING' | 'PRELIMINARY' | 'FINAL' | 'AMENDED';
}

export async function documentsRoutes(fastify: FastifyInstance) {
  // 1. Upload Medical Document
  fastify.post(
    '/patients/:id/documents',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Medical Documents & Lab Results'],
        summary: 'Upload Medical Document',
        description:
          'Uploads a medical document for a patient, computes SHA-256 hash of binary content, and logs audit event.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'p-cardio-01' },
          },
        },
        body: {
          type: 'object',
          required: ['documentType', 'title', 'fileContentBase64'],
          properties: {
            documentType: { type: 'string', example: 'ECG_SCAN' },
            title: { type: 'string', example: '12-Lead Electrocardiogram' },
            fileContentBase64: { type: 'string', example: 'SGVsbG8gV29ybGQ=' },
            fileUrl: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: DocumentUploadBody }>, reply: FastifyReply) => {
      const user = request.userSession || request.user;
      const { id: patientId } = request.params;
      const { documentType, title, fileContentBase64, fileUrl } = request.body;

      if (!documentType || !title || !fileContentBase64) {
        return reply.status(400).send({ error: 'Missing required document fields (documentType, title, fileContentBase64)' });
      }

      // CAAC Check
      const caacResult = await evaluateCAAC({
        userId: user.userId,
        role: user.role,
        activeWardId: user.activeWardId,
        patientId,
      });

      if (!caacResult.isPermitted) {
        await appendAuditBlock({
          userId: user.userId,
          patientId,
          action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          activeWard: user.activeWardId,
          payload: { action: 'UPLOAD_DOCUMENT', reason: caacResult.denialReason },
        });
        return reply.status(403).send({ error: caacResult.denialReason });
      }

      // Compute SHA-256 hash of binary file content (Rule 4)
      const buffer = Buffer.from(fileContentBase64, 'base64');
      const documentHash = crypto.createHash('sha256').update(buffer).digest('hex');
      const docId = crypto.randomUUID();

      const [newDoc] = await dbPrimary
        .insert(medicalDocuments)
        .values({
          id: docId,
          patientId,
          uploaderId: user.userId,
          documentType,
          title,
          fileUrl: fileUrl || `/uploads/documents/${docId}.bin`,
          fileSizeBytes: buffer.length,
          documentHash,
        })
        .returning();

      // Log to Audit Ledger
      await appendAuditBlock({
        userId: user.userId,
        patientId,
        action: 'DOCUMENT_UPLOAD',
        activeWard: user.activeWardId,
        payloadHash: documentHash,
      });

      return reply.status(201).send({
        message: 'Document uploaded successfully',
        document: newDoc,
      });
    }
  );

  // 2. Get Medical Documents for Patient
  fastify.get(
    '/patients/:id/documents',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Medical Documents & Lab Results'],
        summary: 'List Patient Medical Documents',
        description: 'Retrieves all uploaded medical documents for a CAAC-permitted patient record.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'p-cardio-01' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.userSession || request.user;
      const { id: patientId } = request.params;

      const caacResult = await evaluateCAAC({
        userId: user.userId,
        role: user.role,
        activeWardId: user.activeWardId,
        patientId,
      });

      if (!caacResult.isPermitted) {
        await appendAuditBlock({
          userId: user.userId,
          patientId,
          action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          activeWard: user.activeWardId,
          payload: { action: 'GET_DOCUMENTS', reason: caacResult.denialReason },
        });
        return reply.status(403).send({ error: caacResult.denialReason });
      }

      const docs = await dbPrimary
        .select()
        .from(medicalDocuments)
        .where(eq(medicalDocuments.patientId, patientId))
        .orderBy(desc(medicalDocuments.createdAt));

      await appendAuditBlock({
        userId: user.userId,
        patientId,
        action: 'VIEW_DOCUMENTS',
        activeWard: user.activeWardId,
        payload: { count: docs.length },
      });

      return reply.send({ documents: docs });
    }
  );

  // 3. Create Lab Result
  fastify.post(
    '/patients/:id/lab-results',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Medical Documents & Lab Results'],
        summary: 'Add Patient Lab Result',
        description:
          'Creates a lab result record with optional attachment binary SHA-256 calculation and audit log entry.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'p-cardio-01' },
          },
        },
        body: {
          type: 'object',
          required: ['testName', 'category', 'resultDataJson'],
          properties: {
            testName: { type: 'string', example: 'Serum Troponin I' },
            category: { type: 'string', example: 'CARDIOLOGY_LAB' },
            resultDataJson: {
              type: 'object',
              example: { troponinLevel: '2.4 ng/mL', normalRange: '0.0 - 0.04' },
            },
            attachmentBase64: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'PRELIMINARY', 'FINAL', 'AMENDED'] },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string }; Body: LabResultBody }>, reply: FastifyReply) => {
      const user = request.userSession || request.user;
      const { id: patientId } = request.params;
      const { testName, category, resultDataJson, attachmentBase64, status } = request.body;

      if (!testName || !category || !resultDataJson) {
        return reply.status(400).send({ error: 'Missing required lab result fields (testName, category, resultDataJson)' });
      }

      const caacResult = await evaluateCAAC({
        userId: user.userId,
        role: user.role,
        activeWardId: user.activeWardId,
        patientId,
      });

      if (!caacResult.isPermitted) {
        await appendAuditBlock({
          userId: user.userId,
          patientId,
          action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          activeWard: user.activeWardId,
          payload: { action: 'CREATE_LAB_RESULT', reason: caacResult.denialReason },
        });
        return reply.status(403).send({ error: caacResult.denialReason });
      }

      const contentToHash = attachmentBase64
        ? Buffer.from(attachmentBase64, 'base64')
        : JSON.stringify(resultDataJson);

      const documentHash = crypto.createHash('sha256').update(contentToHash).digest('hex');
      const labId = crypto.randomUUID();

      const [newLab] = await dbPrimary
        .insert(labResults)
        .values({
          id: labId,
          patientId,
          orderingDoctorId: user.userId,
          testName,
          category,
          resultDataJson,
          attachmentUrl: attachmentBase64 ? `/uploads/labs/${labId}.bin` : null,
          documentHash,
          status: status || 'FINAL',
        })
        .returning();

      await appendAuditBlock({
        userId: user.userId,
        patientId,
        action: 'LAB_RESULT_UPLOAD',
        activeWard: user.activeWardId,
        payloadHash: documentHash,
      });

      return reply.status(201).send({
        message: 'Lab result created successfully',
        labResult: newLab,
      });
    }
  );

  // 4. Get Lab Results for Patient
  fastify.get(
    '/patients/:id/lab-results',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Medical Documents & Lab Results'],
        summary: 'List Patient Lab Results',
        description: 'Retrieves all lab results for a CAAC-permitted patient record.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'p-cardio-01' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.userSession || request.user;
      const { id: patientId } = request.params;

      const caacResult = await evaluateCAAC({
        userId: user.userId,
        role: user.role,
        activeWardId: user.activeWardId,
        patientId,
      });

      if (!caacResult.isPermitted) {
        await appendAuditBlock({
          userId: user.userId,
          patientId,
          action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          activeWard: user.activeWardId,
          payload: { action: 'GET_LAB_RESULTS', reason: caacResult.denialReason },
        });
        return reply.status(403).send({ error: caacResult.denialReason });
      }

      const labs = await dbPrimary
        .select()
        .from(labResults)
        .where(eq(labResults.patientId, patientId))
        .orderBy(desc(labResults.createdAt));

      await appendAuditBlock({
        userId: user.userId,
        patientId,
        action: 'VIEW_LAB_RESULTS',
        activeWard: user.activeWardId,
        payload: { count: labs.length },
      });

      return reply.send({ labResults: labs });
    }
  );
}

export default documentsRoutes;
