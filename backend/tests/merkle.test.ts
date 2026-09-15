import { describe, it, expect } from 'vitest';
import { appendAuditBlock, verifyHashChainIntegrity, computeMerkleRoot } from '../src/services/merkleEngine';
import crypto from 'crypto';

describe('Phase 3 Cryptographic Audit Ledger Engine Tests', () => {
  it('should append audit blocks and maintain sequential SHA-256 hash chain link', async () => {
    const payloadHash = crypto.createHash('sha256').update('test_payload_1').digest('hex');

    const block = await appendAuditBlock({
      eventType: 'VIEW_RECORD',
      staffId: 'u-doc-cardio',
      patientId: 'p-cardio-01',
      activeWardId: 'w-cardio',
      ipAddress: '127.0.0.1',
      payloadHash,
      executionMode: 'MODE_A',
    });

    expect(block.id).toBeDefined();
    expect(block.currentHash).toHaveLength(64); // SHA-256 hex length
    expect(block.prevHash).toBeDefined();
  });

  it('should verify that the hash chain is 100% cryptographically intact', async () => {
    const result = await verifyHashChainIntegrity();
    expect(result.valid).toBe(true);
    expect(result.totalBlocks).toBeGreaterThan(0);
  });

  it('should compute a non-empty Merkle Root hash over all existing audit blocks', async () => {
    const merkleRoot = await computeMerkleRoot();
    expect(merkleRoot).toHaveLength(64); // SHA-256 root hash length
  });
});
