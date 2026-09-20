import crypto from 'crypto';
import { SecurityMiddlewareOptions, UserContext } from '../types.js';
import { CAACEvaluator } from '../caac/caacEvaluator.js';
import { AuditLogger } from '../audit/auditLogger.js';
import { filterPatientRecordByRole } from '../masking/dtoMasker.js';

export function createAvecinnaFastifyPlugin(sdkOptions: SecurityMiddlewareOptions) {
  const caacEvaluator = new CAACEvaluator(sdkOptions.primaryDbUrl);
  const auditLogger = new AuditLogger(sdkOptions.auditDbUrl);

  const shouldEnforceCaac = sdkOptions.enforceCaac ?? true;
  const shouldEnforceMasking = sdkOptions.enforceDtoMasking ?? true;

  const plugin = async function avecinnaFastifyPlugin(fastify: any) {
    // 1. PreHandler CAAC Authorization Gate
    fastify.addHook('preHandler', async (request: any, reply: any) => {
      let user: UserContext | null = null;
      if (sdkOptions.extractUserContext) {
        user = sdkOptions.extractUserContext(request);
      } else {
        user = request.userSession || request.user || null;
      }

      if (!user || !user.userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Valid clinician session or UserContext is required for @avecina/security-middleware.',
          executionMode: 'MODE_C',
        });
      }

      let patientId: string | null = null;
      if (sdkOptions.extractPatientId) {
        patientId = sdkOptions.extractPatientId(request);
      } else {
        const params = request.params || {};
        const query = request.query || {};
        const body = request.body || {};
        patientId = params.id || params.patientId || query.patientId || body.patientId || null;
      }

      if (shouldEnforceCaac && patientId) {
        const caacResult = await caacEvaluator.evaluate(user, patientId);

        if (!caacResult.isPermitted) {
          await auditLogger.appendBlock({
            userId: user.userId,
            patientId,
            action: 'MODE_C_ACCESS_DENIED',
            activeWard: user.activeWardId,
            ipAddress: request.ip,
            userAgent: request.headers ? request.headers['user-agent'] : undefined,
            httpMethod: request.method,
            requestPath: request.url,
            payload: { reason: caacResult.denialReason },
            executionMode: 'MODE_C',
          });

          return reply.status(403).send({
            error: 'Forbidden',
            message: caacResult.denialReason || 'Access denied by Context-Aware Access Control.',
            executionMode: 'MODE_C',
            patientId,
          });
        }

        request.avecina = {
          user,
          patientId,
          caacResult,
          patient: caacResult.patient,
        };
      } else {
        request.avecina = {
          user,
          patientId,
          caacResult: null,
          patient: null,
        };
      }
    });

    // 2. onSend Hook for DTO Masking & Merkle Audit Ledger
    fastify.addHook('onSend', async (request: any, reply: any, payload: any) => {
      const user = request.avecina?.user || request.userSession || request.user;
      if (!user) return payload;

      reply.header('X-Avecinna-Execution-Mode', 'MODE_C');
      reply.header('X-Avecinna-Audit-Logged', 'true');
      if (request.avecina?.caacResult?.relationshipType) {
        reply.header('X-Avecinna-Relationship-Type', request.avecina.caacResult.relationshipType);
      }

      // Only perform response DTO masking and success audit block for 2xx responses
      if (reply.statusCode < 200 || reply.statusCode >= 300) {
        return payload;
      }

      let data: any;
      try {
        data = typeof payload === 'string' ? JSON.parse(payload) : payload;
      } catch {
        return payload;
      }

      if (shouldEnforceMasking && data && typeof data === 'object') {
        if (data.patient && typeof data.patient === 'object') {
          data.patient = filterPatientRecordByRole(data.patient, user.role, false);
        } else if (data.id || data.mrn) {
          data = filterPatientRecordByRole(data, user.role, false);
        } else if (Array.isArray(data)) {
          data = data.map((item: any) =>
            item && (item.id || item.mrn) ? filterPatientRecordByRole(item, user.role, false) : item
          );
        }
      }

      const pHash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');

      await auditLogger.appendBlock({
        userId: user.userId,
        patientId: request.avecina?.patientId || undefined,
        action: `MODE_C_${request.method}_SUCCESS`,
        activeWard: user.activeWardId,
        relationshipType: request.avecina?.caacResult?.relationshipType || null,
        payloadHash: pHash,
        ipAddress: request.ip,
        userAgent: request.headers ? request.headers['user-agent'] : undefined,
        httpMethod: request.method,
        requestPath: request.url,
        executionMode: 'MODE_C',
      });

      return JSON.stringify(data);
    });
  };

  // Break Fastify encapsulation so hooks apply globally across parent instance
  (plugin as any)[Symbol.for('skip-override')] = true;

  return plugin;
}
