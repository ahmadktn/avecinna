/**
 * @avecina/security-middleware Types & Interfaces
 */

export type UserRole =
  | 'DOCTOR'
  | 'HEAD_OF_UNIT'
  | 'NURSE'
  | 'PARAMEDIC'
  | 'CLERK'
  | 'PHARMACIST'
  | 'ADMIN';

export interface UserContext {
  userId: string;
  username?: string;
  role: UserRole | string;
  activeWardId: string;
  homeWardId?: string;
  shiftStart?: string | Date;
  shiftEnd?: string | Date;
  isBreakGlass?: boolean;
}

export interface CAACEvaluationResult {
  isPermitted: boolean;
  permitted: boolean;
  relationshipType: 'PRIMARY' | 'ON_CALL' | 'CONSULT' | 'OUTPATIENT_DOCTOR' | 'BREAK_GLASS' | null;
  denialReason?: string;
  reason?: string;
  patient?: any;
}

export interface AuditBlockRecord {
  indexNum?: number;
  blockHash: string;
  prevHash: string;
  userId: string;
  patientId?: string | null;
  action: string;
  activeWard: string;
  relationshipType?: string | null;
  payloadHash: string;
  ipAddress?: string;
  userAgent?: string;
  executionMode: 'MODE_C';
  requestId?: string;
  createdAt?: string;
}

export interface SecurityMiddlewareOptions {
  /**
   * PostgreSQL connection string to avecinna_primary_db
   * Required for default database-backed CAAC evaluation.
   */
  primaryDbUrl?: string;

  /**
   * Physically isolated PostgreSQL connection string to avecinna_audit_db
   * Required for append-only SHA-256 Merkle hash chain audit ledger.
   */
  auditDbUrl: string;

  /**
   * Identifying name of the microservice integrating this SDK (e.g. 'radiology-service').
   */
  serviceName?: string;

  /**
   * Custom function to extract UserContext from an incoming request.
   * Defaults to inspecting req.userSession or req.user.
   */
  extractUserContext?: (req: any) => UserContext | null;

  /**
   * Custom function to extract patient ID from an incoming request.
   * Defaults to inspecting req.params.id, req.params.patientId, or req.query.patientId.
   */
  extractPatientId?: (req: any) => string | null;

  /**
   * Whether to automatically mask outgoing patient records according to caller role.
   * Enforces OWASP API3 mitigation and Admin clinical data redaction.
   * Default: true.
   */
  enforceDtoMasking?: boolean;

  /**
   * Whether to enforce Context-Aware Access Control (CAAC) evaluation.
   * Default: true.
   */
  enforceCaac?: boolean;
}

export interface RouteMiddlewareOptions {
  /**
   * URL parameter name representing the patient ID (e.g. 'id' for /patients/:id).
   */
  patientIdParam?: string;

  /**
   * Custom action identifier for the audit ledger (e.g. 'IMAGING_STUDY_READ').
   */
  action?: string;

  /**
   * Override enforceCaac setting for this specific route.
   */
  enforceCaac?: boolean;

  /**
   * Override enforceDtoMasking setting for this specific route.
   */
  enforceDtoMasking?: boolean;
}
