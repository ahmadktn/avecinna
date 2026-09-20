import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { evaluateCAAC } from '../services/caacEngine.js';
import { filterPatientRecordByRole } from '../services/dtoMasker.js';
import { appendAuditBlock } from '../services/merkleEngine.js';

/**
 * Hop-by-hop headers to strip to prevent HTTP proxy smuggling and connection issues
 */
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

/**
 * Extracts patient ID from route params, query string, FHIR reference, or URL pattern
 */
export function extractPatientIdFromRequest(req: FastifyRequest): string | null {
  const params = (req.params || {}) as Record<string, any>;
  if (params.id) return String(params.id);
  if (params.patientId) return String(params.patientId);

  const query = (req.query || {}) as Record<string, any>;
  if (query.patientId) return String(query.patientId);
  if (query.patient) return String(query.patient);
  if (query.subject) return String(query.subject).replace(/^Patient\//, '');

  const url = req.url || '';
  const match = url.match(
    /(?:\/v1\/patients|\/fhir\/Patient|\/patients|\/Patient|\/ws\/rest\/v1\/patient)\/([a-zA-Z0-9_-]+)/i
  );
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

/**
 * Mode B: Security Reverse Proxy Gateway Sidecar Route Plugin
 * Retrofits legacy/third-party EMRs (OpenMRS, Bahmni, FHIR servers) with:
 * 1. Zero-Trust CAAC Authorization evaluation before upstream forwarding
 * 2. Server-Side Role DTO Response Masking (OWASP API3 Mitigation)
 * 3. Cryptographic Audit Ledger Integration into avecinna_audit_db (execution_mode = 'MODE_B')
 */
export async function proxyRoutes(fastify: FastifyInstance) {
  // 1. GET /emr-proxy/status (Health & Configuration status of Mode B Sidecar)
  fastify.get(
    '/emr-proxy/status',
    {
      schema: {
        tags: ['Mode B: EMR Reverse Proxy Sidecar'],
        summary: 'Mode B Security Reverse Proxy Sidecar Status',
        description: 'Returns operational status and upstream target configuration for Mode B sidecar.',
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const upstreamUrl = process.env.UPSTREAM_EMR_URL || null;
      return reply.send({
        status: 'UP',
        executionMode: 'MODE_B',
        upstreamConfigured: Boolean(upstreamUrl),
        upstreamUrl: upstreamUrl ? new URL(upstreamUrl).origin : null,
        timestamp: new Date().toISOString(),
      });
    }
  );

  // 2. Generic Proxy Interceptor & Forwarder
  const handleProxyRequest = async (request: FastifyRequest, reply: FastifyReply) => {
    const session = request.userSession || request.user;
    if (!session || !session.userId) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Valid clinician session or Bearer token is required for Mode B proxy gateway access.',
        executionMode: 'MODE_B',
      });
    }

    const upstreamBase = process.env.UPSTREAM_EMR_URL;
    if (!upstreamBase) {
      return reply.status(502).send({
        error: 'Bad Gateway',
        message: 'UPSTREAM_EMR_UNCONFIGURED: UPSTREAM_EMR_URL environment variable is missing or invalid.',
        executionMode: 'MODE_B',
      });
    }

    const patientId = extractPatientIdFromRequest(request);
    let caacResult: any = null;

    // A. Enforce CAAC if patient ID is identified
    if (patientId) {
      caacResult = await evaluateCAAC({
        userId: session.userId,
        role: session.role,
        activeWardId: session.activeWardId,
        patientId,
        shiftStart: session.shiftStart,
        shiftEnd: session.shiftEnd,
      });

      // If CAAC Denied -> Log Blocked Attempt to isolated avecinna_audit_db and terminate with 403
      if (!caacResult.isPermitted) {
        await appendAuditBlock({
          userId: session.userId,
          patientId,
          action: 'PROXY_ACCESS_DENIED',
          activeWard: session.activeWardId,
          executionMode: 'MODE_B',
          payload: {
            reason: caacResult.denialReason,
            method: request.method,
            url: request.url,
            upstreamBase,
          },
          request,
        });

        return reply.status(403).send({
          error: 'Forbidden',
          message: caacResult.denialReason || 'Access denied by Context-Aware Access Control (Mode B Gateway).',
          executionMode: 'MODE_B',
          patientId,
        });
      }
    }

    // B. Construct Upstream Target URL
    // Strip /emr-proxy prefix so requests like /emr-proxy/v1/patients/p-01 map to /v1/patients/p-01
    const cleanPath = request.url.replace(/^\/emr-proxy/, '') || '/';
    let targetUrl: URL;
    try {
      targetUrl = new URL(cleanPath, upstreamBase);
    } catch (err: any) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: `Invalid upstream target path: ${err.message}`,
        executionMode: 'MODE_B',
      });
    }

    // C. Forward Headers (sanitize hop-by-hop headers)
    const forwardHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(request.headers)) {
      const lowerKey = key.toLowerCase();
      if (!HOP_BY_HOP_HEADERS.has(lowerKey) && typeof value === 'string') {
        forwardHeaders[lowerKey] = value;
      }
    }
    forwardHeaders['x-forwarded-for'] = request.ip || '127.0.0.1';
    forwardHeaders['x-avecina-proxy'] = 'MODE_B_SIDECAR';

    // Body formatting for mutations
    let requestBody: string | undefined = undefined;
    if (['POST', 'PUT', 'PATCH'].includes(request.method) && request.body) {
      requestBody = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
      forwardHeaders['content-type'] = forwardHeaders['content-type'] || 'application/json';
    }

    // D. Upstream HTTP Forwarding with Timeout
    const startTime = Date.now();
    let upstreamRes: Response;
    const timeoutMs = Number(process.env.EMR_PROXY_TIMEOUT_MS) || 10000;

    try {
      upstreamRes = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: forwardHeaders,
        body: requestBody,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err: any) {
      await appendAuditBlock({
        userId: session.userId,
        patientId: patientId || undefined,
        action: 'PROXY_UPSTREAM_UNREACHABLE',
        activeWard: session.activeWardId,
        executionMode: 'MODE_B',
        payload: {
          error: err.message,
          targetUrl: targetUrl.toString(),
          method: request.method,
        },
        request,
      });

      return reply.status(502).send({
        error: 'Bad Gateway',
        message: `Upstream EMR service unreachable or timed out: ${err.message}`,
        executionMode: 'MODE_B',
        upstreamTarget: targetUrl.origin,
      });
    }

    const responseTimeMs = Date.now() - startTime;
    const contentType = upstreamRes.headers.get('content-type') || '';

    // E. Handle Non-OK upstream responses directly
    if (!upstreamRes.ok) {
      const errorText = await upstreamRes.text();
      let errorJson: any;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        errorJson = { raw: errorText };
      }

      await appendAuditBlock({
        userId: session.userId,
        patientId: patientId || undefined,
        action: `PROXY_UPSTREAM_ERROR_${upstreamRes.status}`,
        activeWard: session.activeWardId,
        executionMode: 'MODE_B',
        payload: {
          targetUrl: targetUrl.toString(),
          status: upstreamRes.status,
          responseTimeMs,
        },
        request,
      });

      reply.header('X-Avecinna-Execution-Mode', 'MODE_B');
      return reply.status(upstreamRes.status).send(errorJson);
    }

    // F. Process Successful Upstream Response
    if (contentType.includes('application/json')) {
      const rawData = await upstreamRes.json();
      let finalData = rawData;

      // Apply Role DTO Masking (OWASP API3 Mitigation & Admin Clinical Redaction)
      if (patientId && rawData && typeof rawData === 'object') {
        // If wrapped inside a 'patient' property or direct patient record
        if (rawData.patient && typeof rawData.patient === 'object') {
          finalData = {
            ...rawData,
            patient: filterPatientRecordByRole(rawData.patient, session.role, false),
          };
        } else if (rawData.id || rawData.mrn) {
          finalData = filterPatientRecordByRole(rawData, session.role, false);
        } else if (Array.isArray(rawData)) {
          // List of patients
          finalData = rawData.map((item: any) =>
            item && (item.id || item.mrn) ? filterPatientRecordByRole(item, session.role, false) : item
          );
        }
      }

      // Compute Cryptographic Payload Hash
      const payloadHash = crypto.createHash('sha256').update(JSON.stringify(finalData)).digest('hex');

      // Append Audit Block to Isolated avecinna_audit_db
      await appendAuditBlock({
        userId: session.userId,
        patientId: patientId || undefined,
        action: `PROXY_${request.method}_SUCCESS`,
        activeWard: session.activeWardId,
        relationshipType: caacResult?.relationshipType || undefined,
        payloadHash,
        executionMode: 'MODE_B',
        payload: {
          upstreamUrl: targetUrl.toString(),
          upstreamStatus: upstreamRes.status,
          responseTimeMs,
          role: session.role,
          relationshipType: caacResult?.relationshipType || null,
        },
        request,
      });

      reply.header('X-Avecinna-Execution-Mode', 'MODE_B');
      reply.header('X-Avecinna-Audit-Logged', 'true');
      if (caacResult?.relationshipType) {
        reply.header('X-Avecinna-Relationship-Type', caacResult.relationshipType);
      }

      return reply.status(upstreamRes.status).send(finalData);
    } else {
      // Non-JSON Response (binary documents, raw HL7, etc.)
      const arrayBuffer = await upstreamRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const payloadHash = crypto.createHash('sha256').update(buffer).digest('hex');

      await appendAuditBlock({
        userId: session.userId,
        patientId: patientId || undefined,
        action: `PROXY_${request.method}_BINARY_SUCCESS`,
        activeWard: session.activeWardId,
        relationshipType: caacResult?.relationshipType || undefined,
        payloadHash,
        executionMode: 'MODE_B',
        payload: {
          upstreamUrl: targetUrl.toString(),
          bytes: buffer.byteLength,
          contentType,
        },
        request,
      });

      reply.header('X-Avecinna-Execution-Mode', 'MODE_B');
      reply.header('X-Avecinna-Audit-Logged', 'true');
      reply.header('content-type', contentType);
      return reply.status(upstreamRes.status).send(buffer);
    }
  };

  // Register endpoints with preHandler authentication
  fastify.all('/emr-proxy/*', { preHandler: [fastify.authenticate] }, handleProxyRequest);
}

export default proxyRoutes;
