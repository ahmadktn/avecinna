import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbPrimary } from '../db/clientPrimary';
import { medicalDocuments, labResults, patients } from '../db/schemaPrimary';
import { eq, desc } from 'drizzle-orm';
import { evaluateCAAC } from '../services/caacEngine';
import { appendAuditBlock } from '../services/merkleEngine';
import crypto from 'crypto';

interface DocumentUploadBody {
  documentType: string;
  title: string;
  fileContentBase64: string; // Base64 encoded file binary
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
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string }; Body: DocumentUploadBody }>, reply: FastifyReply) => {
      const user = request.user;
      const { id: patientId } = request.params;
      const { documentType, title, fileContentBase64, fileUrl } = request.body;

      if (!documentType || !title || !fileContentBase64) {
        return reply.status(400).send({ error: 'Missing required document fields (documentType, title, fileContentBase64)' });
      }

      // CAAC Check
      const caacResult = await evaluateCAAC(user, patientId);
      if (!caacResult.permitted) {
        await appendAuditBlock({
          eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          staffId: user.userId,
          patientId,
          activeWardId: user.activeWardId,
          ipAddress: request.ip,
          payloadHash: crypto.createHash('sha256').update(JSON.stringify({ action: 'UPLOAD_DOCUMENT', reason: caacResult.reason })).digest('hex'),
          executionMode: 'MODE_A',
        });
        return reply.status(403).send({ error: caacResult.reason });
      }

      // Compute SHA-256 hash of binary file content (Rule 4)
      const buffer = Buffer.from(fileContentBase64, 'base64');
      const documentHash = crypto.createHash('sha256').update(buffer).digest('hex');
      const docId = crypto.randomUUID();

      const [newDoc] = await dbPrimary.insert(medicalDocuments).values({
        id: docId,
        patientId,
        uploaderId: user.userId,
        documentType,
        title,
        fileUrl: fileUrl || `/uploads/documents/${docId}.bin`,
        fileSizeBytes: buffer.length,
        documentHash,
      }).returning();

      // Log to Audit Ledger
      await appendAuditBlock({
        eventType: 'DOCUMENT_UPLOAD',
        staffId: user.userId,
        patientId,
        activeWardId: user.activeWardId,
        ipAddress: request.ip,
        payloadHash: documentHash,
        executionMode: 'MODE_A',
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
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user;
      const { id: patientId } = request.params;

      const caacResult = await evaluateCAAC(user, patientId);
      if (!caacResult.permitted) {
        await appendAuditBlock({
          eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          staffId: user.userId,
          patientId,
          activeWardId: user.activeWardId,
          ipAddress: request.ip,
          payloadHash: crypto.createHash('sha256').update(JSON.stringify({ action: 'GET_DOCUMENTS', reason: caacResult.reason })).digest('hex'),
          executionMode: 'MODE_A',
        });
        return reply.status(403).send({ error: caacResult.reason });
      }

      const docs = await dbPrimary
        .select()
        .from(medicalDocuments)
        .where(eq(medicalDocuments.patientId, patientId))
        .orderBy(desc(medicalDocuments.createdAt));

      await appendAuditBlock({
        eventType: 'VIEW_RECORD',
        staffId: user.userId,
        patientId,
        activeWardId: user.activeWardId,
        ipAddress: request.ip,
        payloadHash: crypto.createHash('sha256').update(JSON.stringify({ count: docs.length })).digest('hex'),
        executionMode: 'MODE_A',
      });

      return reply.send({ documents: docs });
    }
  );

  // 3. Create Lab Result
  fastify.post(
    '/patients/:id/lab-results',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string }; Body: LabResultBody }>, reply: FastifyReply) => {
      const user = request.user;
      const { id: patientId } = request.params;
      const { testName, category, resultDataJson, attachmentBase64, status } = request.body;

      if (!testName || !category || !resultDataJson) {
        return reply.status(400).send({ error: 'Missing required lab result fields (testName, category, resultDataJson)' });
      }

      const caacResult = await evaluateCAAC(user, patientId);
      if (!caacResult.permitted) {
        await appendAuditBlock({
          eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          staffId: user.userId,
          patientId,
          activeWardId: user.activeWardId,
          ipAddress: request.ip,
          payloadHash: crypto.createHash('sha256').update(JSON.stringify({ action: 'CREATE_LAB_RESULT', reason: caacResult.reason })).digest('hex'),
          executionMode: 'MODE_A',
        });
        return reply.status(403).send({ error: caacResult.reason });
      }

      const contentToHash = attachmentBase64
        ? Buffer.from(attachmentBase64, 'base64')
        : JSON.stringify(resultDataJson);
      
      const documentHash = crypto.createHash('sha256').update(contentToHash).digest('hex');
      const labId = crypto.randomUUID();

      const [newLab] = await dbPrimary.insert(labResults).values({
        id: labId,
        patientId,
        orderingDoctorId: user.userId,
        testName,
        category,
        resultDataJson,
        attachmentUrl: attachmentBase64 ? `/uploads/labs/${labId}.bin` : null,
        documentHash,
        status: status || 'FINAL',
      }).returning();

      await appendAuditBlock({
        eventType: 'LAB_RESULT_UPLOAD',
        staffId: user.userId,
        patientId,
        activeWardId: user.activeWardId,
        ipAddress: request.ip,
        payloadHash: documentHash,
        executionMode: 'MODE_A',
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
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user;
      const { id: patientId } = request.params;

      const caacResult = await evaluateCAAC(user, patientId);
      if (!caacResult.permitted) {
        await appendAuditBlock({
          eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          staffId: user.userId,
          patientId,
          activeWardId: user.activeWardId,
          ipAddress: request.ip,
          payloadHash: crypto.createHash('sha256').update(JSON.stringify({ action: 'GET_LAB_RESULTS', reason: caacResult.reason })).digest('hex'),
          executionMode: 'MODE_A',
        });
        return reply.status(403).send({ error: caacResult.reason });
      }

      const labs = await dbPrimary
        .select()
        .from(labResults)
        .where(eq(labResults.patientId, patientId))
        .orderBy(desc(labResults.createdAt));

      await appendAuditBlock({
        eventType: 'VIEW_RECORD',
        staffId: user.userId,
        patientId,
        activeWardId: user.activeWardId,
        ipAddress: request.ip,
        payloadHash: crypto.createHash('sha256').update(JSON.stringify({ count: labs.length })).digest('hex'),
        executionMode: 'MODE_A',
      });

      return reply.send({ labResults: labs });
    }
  );
}
