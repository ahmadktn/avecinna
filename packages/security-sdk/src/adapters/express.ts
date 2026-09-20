import crypto from 'crypto';
import { CAACService } from '../caac/caacService.js';
import { DTOMaskingService } from '../masking/maskingService.js';
import { AuditService } from '../audit/auditService.js';
import { AvecinnaSDKOptions, ExpressAdapterOptions, UserContext } from '../types/index.js';

export function createExpressAdapter(
  caac: CAACService,
  masking: DTOMaskingService,
  audit: AuditService,
  sdkOptions: AvecinnaSDKOptions
) {
  return function expressMiddleware(adapterOptions?: ExpressAdapterOptions) {
    const shouldEnforceCaac = adapterOptions?.enforceCaac ?? sdkOptions.enforceCaac ?? true;
    const shouldEnforceMasking = adapterOptions?.enforceDtoMasking ?? sdkOptions.enforceDtoMasking ?? true;
    const patientParamName = adapterOptions?.patientIdParam || 'id';

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
            message: 'Valid clinician session or UserContext is required for @avecina/sdk.',
            executionMode: sdkOptions.executionMode || 'MODE_C',
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
          caacResult = await caac.evaluate({
            userId: user.userId,
            role: user.role,
            activeWardId: user.activeWardId,
            patientId,
            shiftStart: user.shiftStart,
            shiftEnd: user.shiftEnd,
            isBreakGlass: user.isBreakGlass,
          });

          if (!caacResult.isPermitted) {
            await audit.log({
              userId: user.userId,
              patientId,
              action: adapterOptions?.action ? `${adapterOptions.action}_DENIED` : 'MODE_C_ACCESS_DENIED',
              activeWard: user.activeWardId,
              ipAddress: req.ip || req.connection?.remoteAddress,
              userAgent: req.headers ? req.headers['user-agent'] : undefined,
              httpMethod: req.method,
              requestPath: req.originalUrl || req.url,
              payload: { reason: caacResult.denialReason },
              executionMode: sdkOptions.executionMode || 'MODE_C',
            });

            return res.status(403).json({
              error: 'Forbidden',
              message: caacResult.denialReason || 'Access denied by Context-Aware Access Control.',
              executionMode: sdkOptions.executionMode || 'MODE_C',
              patientId,
            });
          }
        }

        // Attach Avecinna context to request object
        req.avecina = {
          user,
          patientId,
          caacResult,
          patient: caacResult?.patient || null,
        };

        // 4. Intercept Outgoing Response for DTO Masking & Merkle Audit Logging
        const originalJson = res.json.bind(res);

        res.json = async function (data: any) {
          let finalPayload = data;

          if (shouldEnforceMasking && finalPayload && typeof finalPayload === 'object') {
            if (finalPayload.patient && typeof finalPayload.patient === 'object') {
              finalPayload = {
                ...finalPayload,
                patient: masking.maskPatient(finalPayload.patient, user!.role, false),
              };
            } else if (finalPayload.id || finalPayload.mrn) {
              finalPayload = masking.maskPatient(finalPayload, user!.role, false);
            } else if (Array.isArray(finalPayload)) {
              finalPayload = finalPayload.map((item: any) =>
                item && (item.id || item.mrn) ? masking.maskPatient(item, user!.role, false) : item
              );
            }
          }

          const payloadHash = crypto.createHash('sha256').update(JSON.stringify(finalPayload || {})).digest('hex');

          res.setHeader('X-Avecinna-Execution-Mode', sdkOptions.executionMode || 'MODE_C');
          res.setHeader('X-Avecinna-Audit-Logged', 'true');
          if (caacResult?.relationshipType) {
            res.setHeader('X-Avecinna-Relationship-Type', caacResult.relationshipType);
          }

          try {
            await audit.log({
              userId: user!.userId,
              patientId: patientId || undefined,
              action: adapterOptions?.action || `MODE_C_${req.method}_SUCCESS`,
              activeWard: user!.activeWardId,
              relationshipType: caacResult?.relationshipType || null,
              payloadHash,
              ipAddress: req.ip || req.connection?.remoteAddress,
              userAgent: req.headers ? req.headers['user-agent'] : undefined,
              httpMethod: req.method,
              requestPath: req.originalUrl || req.url,
              executionMode: sdkOptions.executionMode || 'MODE_C',
            });
          } catch (err) {
            console.error('[@avecina/sdk] Audit logging error in Express adapter:', err);
          }

          return originalJson(finalPayload);
        };

        return next();
      } catch (err) {
        return next(err);
      }
    };
  };
}
