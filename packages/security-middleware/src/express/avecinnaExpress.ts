import crypto from 'crypto';
import { SecurityMiddlewareOptions, RouteMiddlewareOptions, UserContext } from '../types.js';
import { CAACEvaluator } from '../caac/caacEvaluator.js';
import { AuditLogger } from '../audit/auditLogger.js';
import { filterPatientRecordByRole } from '../masking/dtoMasker.js';

export function createAvecinnaExpressMiddleware(
  sdkOptions: SecurityMiddlewareOptions,
  routeOptions?: RouteMiddlewareOptions
) {
  const caacEvaluator = new CAACEvaluator(sdkOptions.primaryDbUrl);
  const auditLogger = new AuditLogger(sdkOptions.auditDbUrl);

  const shouldEnforceCaac = routeOptions?.enforceCaac ?? sdkOptions.enforceCaac ?? true;
  const shouldEnforceMasking = routeOptions?.enforceDtoMasking ?? sdkOptions.enforceDtoMasking ?? true;
  const patientParamName = routeOptions?.patientIdParam || 'id';

  return async (req: any, res: any, next: any) => {
    try {
      // 1. Resolve User Context
      let user: UserContext | null = null;
      if (sdkOptions.extractUserContext) {
        user = sdkOptions.extractUserContext(req);
      } else {
        user = req.userSession || req.user || null;
      }

      if (!user || !user.userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Valid clinician session or UserContext is required for @avecina/security-middleware.',
          executionMode: 'MODE_C',
        });
      }

      // 2. Resolve Patient ID
      let patientId: string | null = null;
      if (sdkOptions.extractPatientId) {
        patientId = sdkOptions.extractPatientId(req);
      } else {
        patientId =
          (req.params && req.params[patientParamName]) ||
          (req.query && req.query.patientId) ||
          (req.body && req.body.patientId) ||
          null;
      }

      let caacResult: any = null;

      // 3. Evaluate CAAC Authorization Gate
      if (shouldEnforceCaac && patientId) {
        caacResult = await caacEvaluator.evaluate(user, patientId);

        if (!caacResult.isPermitted) {
          // Log blocked event to isolated audit DB
          await auditLogger.appendBlock({
            userId: user.userId,
            patientId,
            action: routeOptions?.action ? `${routeOptions.action}_DENIED` : 'MODE_C_ACCESS_DENIED',
            activeWard: user.activeWardId,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers ? req.headers['user-agent'] : undefined,
            httpMethod: req.method,
            requestPath: req.originalUrl || req.url,
            payload: { reason: caacResult.denialReason },
            executionMode: 'MODE_C',
          });

          return res.status(403).json({
            error: 'Forbidden',
            message: caacResult.denialReason || 'Access denied by Context-Aware Access Control.',
            executionMode: 'MODE_C',
            patientId,
          });
        }
      }

      // Attach Avecinna security context to request
      req.avecina = {
        user,
        patientId,
        caacResult,
        patient: caacResult?.patient || null,
      };

      // 4. Intercept Outgoing Response for DTO Masking & Merkle Audit Logging
      const originalJson = res.json.bind(res);

      res.json = function (data: any) {
        let finalPayload = data;

        // Apply Role DTO Masking (OWASP API3 Mitigation & Admin Clinical Redaction)
        if (shouldEnforceMasking && finalPayload && typeof finalPayload === 'object') {
          if (finalPayload.patient && typeof finalPayload.patient === 'object') {
            finalPayload = {
              ...finalPayload,
              patient: filterPatientRecordByRole(finalPayload.patient, user!.role, false),
            };
          } else if (finalPayload.id || finalPayload.mrn) {
            finalPayload = filterPatientRecordByRole(finalPayload, user!.role, false);
          } else if (Array.isArray(finalPayload)) {
            finalPayload = finalPayload.map((item: any) =>
              item && (item.id || item.mrn) ? filterPatientRecordByRole(item, user!.role, false) : item
            );
          }
        }

        // Compute SHA-256 payload hash
        const payloadHash = crypto.createHash('sha256').update(JSON.stringify(finalPayload || {})).digest('hex');

        // Set security headers
        res.setHeader('X-Avecinna-Execution-Mode', 'MODE_C');
        res.setHeader('X-Avecinna-Audit-Logged', 'true');
        if (caacResult?.relationshipType) {
          res.setHeader('X-Avecinna-Relationship-Type', caacResult.relationshipType);
        }

        // Await cryptographic audit block sealing before transmitting ePHI response
        try {
          await auditLogger.appendBlock({
            userId: user!.userId,
            patientId: patientId || undefined,
            action: routeOptions?.action || `MODE_C_${req.method}_SUCCESS`,
            activeWard: user!.activeWardId,
            relationshipType: caacResult?.relationshipType || null,
            payloadHash,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers ? req.headers['user-agent'] : undefined,
            httpMethod: req.method,
            requestPath: req.originalUrl || req.url,
            executionMode: 'MODE_C',
          });
        } catch (err) {
          console.error('[@avecina/security-middleware] Audit logging error:', err);
        }

        return originalJson(finalPayload);
      };

      return next();
    } catch (err) {
      return next(err);
    }
  };
}
