/**
 * @avecina/sdk - Core Domain Types & Configuration Interfaces
 */

export type UserRole =
  | 'DOCTOR'
  | 'HEAD_OF_UNIT'
  | 'NURSE'
  | 'PARAMEDIC'
  | 'CLERK'
  | 'PHARMACIST'
  | 'ADMIN';

export type RelationshipType =
  | 'PRIMARY'
  | 'ON_CALL'
  | 'CONSULT'
  | 'OUTPATIENT_DOCTOR'
  | 'BREAK_GLASS';

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

export interface CAACInput {
  userId: string;
  role: UserRole | string;
  activeWardId: string;
  patientId: string;
  shiftStart?: string | Date;
  shiftEnd?: string | Date;
  isBreakGlass?: boolean;
}

export interface CAACDecision {
  isPermitted: boolean;
  permitted: boolean;
  relationshipType: RelationshipType | null;
  denialReason?: string;
  reason?: string;
  patient?: any;
}

export interface FullPatientRecord {
  id: string;
  mrn: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  patientType?: string;
  genotype?: string | null;
  bloodGroup?: string | null;
  primaryWardId?: string | null;
  assignedBed?: string | null;
  allergiesJson?: any;
  emergencySummaryJson?: any;
  fullRecordJson?: any;
  [key: string]: any;
}

export interface AuditLogInput {
  userId: string;
  patientId?: string | null;
  action: string;
  activeWard: string;
  relationshipType?: string | null;
  payload?: any;
  payloadHash?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  deviceInfo?: string;
  httpMethod?: string;
  requestPath?: string;
  requestId?: string;
  executionMode?: string;
}

export interface AuditReceipt {
  indexNum: number;
  blockHash: string;
  prevHash: string;
  executionMode: string;
  timestamp: string;
}

export interface LedgerVerificationResult {
  valid: boolean;
  status: 'VERIFIED' | 'CORRUPTED';
  isolatedAuditDatabase: string;
  totalBlocks: number;
  latestBlockHash: string;
  tamperedBlockIndex: number | null;
}

export interface AvecinnaSDKOptions {
  /**
   * PostgreSQL connection string to avecinna_primary_db
   * Required for direct CAAC evaluation against clinical tables.
   */
  primaryDbUrl?: string;

  /**
   * PostgreSQL connection string to physically isolated avecinna_audit_db
   * Required for append-only cryptographic Merkle hash chain audit ledger.
   */
  auditDbUrl: string;

  /**
   * Identifier for the calling microservice or application (e.g. 'radiology-service').
   */
  serviceName?: string;

  /**
   * Execution mode tag for audit records. Defaults to 'MODE_C'.
   */
  executionMode?: 'MODE_B' | 'MODE_C' | string;

  /**
   * Enable/disable automatic CAAC enforcement. Default: true.
   */
  enforceCaac?: boolean;

  /**
   * Enable/disable server-side role DTO masking. Default: true.
   */
  enforceDtoMasking?: boolean;

  /**
   * Custom resolver function for extracting UserContext from an arbitrary request.
   */
  extractUserContext?: (req: any) => UserContext | null;

  /**
   * Custom resolver function for extracting patient ID from an arbitrary request.
   */
  extractPatientId?: (req: any) => string | null;
}

export interface ExpressAdapterOptions {
  patientIdParam?: string;
  action?: string;
  enforceCaac?: boolean;
  enforceDtoMasking?: boolean;
}

export interface FastifyAdapterOptions {
  patientIdParam?: string;
  action?: string;
  enforceCaac?: boolean;
  enforceDtoMasking?: boolean;
}

export interface WebStandardGuardOptions {
  patientId?: string;
  action?: string;
  enforceCaac?: boolean;
}
