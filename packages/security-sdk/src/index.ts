/**
 * @avecina/sdk - Universal Zero-Trust Healthcare Developer SDK
 *
 * Provides Context-Aware Access Control (CAAC), Role-Based DTO Response Masking (OWASP API3 Mitigation),
 * and Append-Only Cryptographic Merkle Hash Chain Audit Logging into isolated avecinna_audit_db.
 */

export * from './types/index.js';
export * from './client.js';
export * from './caac/caacService.js';
export * from './masking/maskingService.js';
export * from './audit/auditService.js';
export * from './adapters/express.js';
export * from './adapters/fastify.js';
export * from './adapters/webStandard.js';

// Standalone Functional Helpers (for functional programming paradigms)
export { filterPatientRecordByRole } from './masking/maskingService.js';
