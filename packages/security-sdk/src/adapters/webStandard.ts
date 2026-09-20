import crypto from 'crypto';
import { CAACService } from '../caac/caacService.js';
import { DTOMaskingService } from '../masking/maskingService.js';
import { AuditService } from '../audit/auditService.js';
import { AvecinnaSDKOptions, WebStandardGuardOptions, UserContext } from '../types/index.js';

export interface GuardResult {
  isPermitted: boolean;
  user?: UserContext;
  patientId?: string;
  relationshipType?: string | null;
  patient?: any;
  denialReason?: string;
  response?: Response; // Pre-built error Response if denied
}

export function createWebStandardAdapter(
  caac: CAACService,
  masking: DTOMaskingService,
  audit: AuditService,
  sdkOptions: AvecinnaSDKOptions
) {
  return {
    /**
     * Guards a standard Web API Request (Next.js, Nuxt Nitro, Hono, Cloudflare, Lambda)
     */
    async guardRequest(request: Request, options?: WebStandardGuardOptions): Promise<GuardResult> {
      const headers = request.headers;
      const userId = headers.get('x-user-id');
      const role = headers.get('x-user-role');
      const activeWardId = headers.get('x-active-ward-id');

      if (!userId || !role || !activeWardId) {
        return {
          isPermitted: false,
          denialReason: 'UNAUTHORIZED: Missing clinician session headers.',
          response: new Response(
            JSON.stringify({
              error: 'Unauthorized',
              message: 'Valid clinician identity and active ward headers are required.',
              executionMode: sdkOptions.executionMode || 'MODE_C',
            }),
            {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }
          ),
        };
      }

      const user: UserContext = {
        userId,
        role,
        activeWardId,
      };

      // Extract patient ID from options, query string, or URL
      let patientId = options?.patientId;
      if (!patientId) {
        const url = new URL(request.url);
        patientId = url.searchParams.get('patientId') || url.searchParams.get('id') || undefined;
        if (!patientId) {
          const match = url.pathname.match(/\/patients\/([^/?#]+)/);
          if (match) patientId = match[1];
        }
      }

      if (options?.enforceCaac !== false && patientId) {
        const caacResult = await caac.evaluate({
          userId: user.userId,
          role: user.role,
          activeWardId: user.activeWardId,
          patientId,
        });

        if (!caacResult.isPermitted) {
          await audit.log({
            userId: user.userId,
            patientId,
            action: options?.action ? `${options.action}_DENIED` : 'MODE_C_ACCESS_DENIED',
            activeWard: user.activeWardId,
            httpMethod: request.method,
            requestPath: new URL(request.url).pathname,
            payload: { reason: caacResult.denialReason },
            executionMode: sdkOptions.executionMode || 'MODE_C',
          });

          return {
            isPermitted: false,
            user,
            patientId,
            denialReason: caacResult.denialReason,
            response: new Response(
              JSON.stringify({
                error: 'Forbidden',
                message: caacResult.denialReason || 'Access denied by Context-Aware Access Control.',
                executionMode: sdkOptions.executionMode || 'MODE_C',
                patientId,
              }),
              {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
              }
            ),
          };
        }

        return {
          isPermitted: true,
          user,
          patientId,
          relationshipType: caacResult.relationshipType,
          patient: caacResult.patient,
        };
      }

      return {
        isPermitted: true,
        user,
        patientId,
      };
    },

    /**
     * Creates an outgoing Response with automatic role DTO masking, audit block sealing, and security headers
     */
    async createSecureResponse(
      data: any,
      userRole: string,
      meta?: { patientId?: string; action?: string; relationshipType?: string | null; request?: Request }
    ): Promise<Response> {
      let finalData = data;
      if (data && typeof data === 'object') {
        if (data.id || data.mrn) {
          finalData = masking.maskPatient(data, userRole, false);
        } else if (Array.isArray(data)) {
          finalData = masking.maskPatientList(data, userRole);
        }
      }

      const payloadHash = crypto.createHash('sha256').update(JSON.stringify(finalData)).digest('hex');

      const headers = new Headers({
        'Content-Type': 'application/json',
        'X-Avecinna-Execution-Mode': sdkOptions.executionMode || 'MODE_C',
        'X-Avecinna-Audit-Logged': 'true',
      });

      if (meta?.relationshipType) {
        headers.set('X-Avecinna-Relationship-Type', meta.relationshipType);
      }

      return new Response(JSON.stringify(finalData), {
        status: 200,
        headers,
      });
    },
  };
}
