import { AvecinnaSDKOptions, ExpressAdapterOptions, FastifyAdapterOptions, WebStandardGuardOptions } from './types/index.js';
import { CAACService } from './caac/caacService.js';
import { DTOMaskingService } from './masking/maskingService.js';
import { AuditService } from './audit/auditService.js';
import { createExpressAdapter } from './adapters/express.js';
import { createFastifyAdapter } from './adapters/fastify.js';
import { createWebStandardAdapter, GuardResult } from './adapters/webStandard.js';

/**
 * Universal Zero-Trust Healthcare Developer SDK Client
 *
 * Provides standalone services for CAAC authorization, role DTO response masking,
 * and immutable SHA-256 Merkle audit logging, along with drop-in adapters for Express,
 * Fastify, and Web Standard runtimes (Next.js, Nuxt Nitro, Hono, Cloudflare, Lambda).
 */
export class AvecinnaSDK {
  public readonly caac: CAACService;
  public readonly masking: DTOMaskingService;
  public readonly audit: AuditService;

  private readonly expressAdapter: ReturnType<typeof createExpressAdapter>;
  private readonly fastifyAdapter: ReturnType<typeof createFastifyAdapter>;
  private readonly webStandardAdapter: ReturnType<typeof createWebStandardAdapter>;

  constructor(options: AvecinnaSDKOptions) {
    if (!options.auditDbUrl) {
      throw new Error(
        'AUDIT_DB_UNCONFIGURED: auditDbUrl is required to initialize the AvecinnaSDK isolated audit ledger.'
      );
    }

    this.caac = new CAACService(options.primaryDbUrl);
    this.masking = new DTOMaskingService();
    this.audit = new AuditService(options.auditDbUrl, options.executionMode || 'MODE_C');

    this.expressAdapter = createExpressAdapter(this.caac, this.masking, this.audit, options);
    this.fastifyAdapter = createFastifyAdapter(this.caac, this.masking, this.audit, options);
    this.webStandardAdapter = createWebStandardAdapter(this.caac, this.masking, this.audit, options);
  }

  /**
   * Generates Express middleware enforcing CAAC, DTO masking, and Merkle audit logging
   */
  public express(options?: ExpressAdapterOptions) {
    return this.expressAdapter(options);
  }

  /**
   * Generates Fastify plugin enforcing CAAC, DTO masking, and Merkle audit logging
   */
  public fastify(options?: FastifyAdapterOptions) {
    return this.fastifyAdapter(options);
  }

  /**
   * Evaluates CAAC and guards a standard Web API Request (Next.js, Nuxt, Hono, Cloudflare, Lambda)
   */
  public async guardRequest(request: Request, options?: WebStandardGuardOptions): Promise<GuardResult> {
    return this.webStandardAdapter.guardRequest(request, options);
  }

  /**
   * Creates a Web Standard Response with automatic role DTO masking and security headers
   */
  public async createSecureResponse(
    data: any,
    userRole: string,
    meta?: { patientId?: string; action?: string; relationshipType?: string | null; request?: Request }
  ): Promise<Response> {
    return this.webStandardAdapter.createSecureResponse(data, userRole, meta);
  }

  /**
   * Gracefully closes database connection pools
   */
  public async close(): Promise<void> {
    await Promise.all([this.caac.close(), this.audit.close()]);
  }
}
