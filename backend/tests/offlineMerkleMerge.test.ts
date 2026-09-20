import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import {
  appendAuditBlock,
  buildMerkleTreeRoot,
  mergeOfflineAuditBranch,
  verifyAuditLedgerChain,
  type OfflineBlockInput,
} from '../src/services/merkleEngine';
import { dbAudit } from '../src/db/clientAudit';
import { auditBlocks } from '../src/db/schemaAudit';
import { eq } from 'drizzle-orm';

describe('Phase 5: Offline-First Storage & Dual-Parent Merkle DAG Merge Tests', () => {
  it('should compute binary Merkle tree root correctly over an odd/even leaf set', () => {
    const leafA = crypto.createHash('sha256').update('leaf_A').digest('hex');
    const leafB = crypto.createHash('sha256').update('leaf_B').digest('hex');
    const leafC = crypto.createHash('sha256').update('leaf_C').digest('hex');

    // 2 leaves
    const root2 = buildMerkleTreeRoot([leafA, leafB]);
    const expectedRoot2 = crypto.createHash('sha256').update(leafA + leafB).digest('hex');
    expect(root2).toBe(expectedRoot2);

    // 3 leaves (odd count duplicates last leaf)
    const root3 = buildMerkleTreeRoot([leafA, leafB, leafC]);
    const parentAB = crypto.createHash('sha256').update(leafA + leafB).digest('hex');
    const parentCC = crypto.createHash('sha256').update(leafC + leafC).digest('hex');
    const expectedRoot3 = crypto.createHash('sha256').update(parentAB + parentCC).digest('hex');
    expect(root3).toBe(expectedRoot3);
  });

  it('should reconcile an offline ward audit branch and create a dual-parent merge commit', async () => {
    // 1. Create a baseline online block to act as the branch ancestor
    const baseBlock: any = await appendAuditBlock({
      userId: 'u-doc-cardio',
      patientId: 'p-cardio-01',
      action: 'ONLINE_BASELINE_CHECK',
      activeWard: 'w-cardio',
      ipAddress: '127.0.0.1',
      payload: { status: 'pre-offline-network-drop' },
      executionMode: 'MODE_A',
    });

    const ancestorHash = baseBlock.blockHash || baseBlock.currentHash;
    expect(ancestorHash).toBeDefined();

    // 2. Simulate 3 offline actions performed on a disconnected clinical workstation
    const offlineBlocks: OfflineBlockInput[] = [];
    let currentPrevHash = ancestorHash;

    const offlineActions = [
      { action: 'OFFLINE_PATIENT_VIEW', payload: { action: 'viewed_chart_in_field' } },
      { action: 'OFFLINE_BEDSIDE_OBSERVATION', payload: { vitals: { hr: 84, bp: '120/80' } } },
      { action: 'OFFLINE_BREAK_GLASS_TIER1', payload: { reason: 'Cardiac arrest resuscitation' } },
    ];

    for (let i = 0; i < offlineActions.length; i++) {
      const act = offlineActions[i];
      const timestamp = new Date(Date.now() + i * 1000).toISOString();
      const pHash = crypto.createHash('sha256').update(JSON.stringify(act.payload)).digest('hex');
      const rawString = `${currentPrevHash}|u-nurse-cardio|p-cardio-01|${act.action}|w-cardio|${pHash}|127.0.0.1|${timestamp}`;
      const blockHash = crypto.createHash('sha256').update(rawString).digest('hex');

      offlineBlocks.push({
        blockHash,
        prevHash: currentPrevHash,
        userId: 'u-nurse-cardio',
        patientId: 'p-cardio-01',
        action: act.action,
        activeWard: 'w-cardio',
        payloadHash: pHash,
        payload: act.payload,
        timestamp,
        ipAddress: '127.0.0.1',
        userAgent: 'Offline Clinical Tablet',
      });

      currentPrevHash = blockHash;
    }

    const branchHeadHash = offlineBlocks[offlineBlocks.length - 1].blockHash;
    const branchRootHash = buildMerkleTreeRoot(offlineBlocks.map((b) => b.blockHash));

    // 3. Execute Dual-Parent Merkle DAG merge
    const mergeResult = await mergeOfflineAuditBranch({
      branchHeadHash,
      branchRootHash,
      blocks: offlineBlocks,
      syncedByUserId: 'u-nurse-cardio',
      syncedFromWard: 'w-cardio',
    });

    expect(mergeResult.success).toBe(true);
    expect(mergeResult.syncedBlocksCount).toBe(3);
    expect(mergeResult.branchMerkleRoot).toBe(branchRootHash);
    expect(mergeResult.mergeNode).toBeDefined();
    expect(mergeResult.mergeNode.action).toBe('OFFLINE_BRANCH_MERGE');
    expect(mergeResult.mergeNode.secondaryParentHash).toBe(branchHeadHash);

    // 4. Verify all offline blocks exist in avecinna_audit_db with is_offline_sync = true
    for (const b of offlineBlocks) {
      const [found] = await dbAudit.select().from(auditBlocks).where(eq(auditBlocks.blockHash, b.blockHash)).limit(1);
      expect(found).toBeDefined();
      expect(found.isOfflineSync).toBe(true);
      expect(found.executionMode).toBe('MODE_A_OFFLINE');
    }

    // 5. Verify entire audit ledger remains 100% cryptographically intact with dual parents
    const verification = await verifyAuditLedgerChain();
    expect(verification.valid).toBe(true);
    expect(verification.status).toBe('VERIFIED');
    expect(verification.tamperedBlockIndex).toBeNull();
  });

  it('should strictly reject an offline branch containing a tampered or corrupted block hash', async () => {
    // Fabricate a corrupt block with invalid hash
    const corruptBlock: OfflineBlockInput = {
      blockHash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
      userId: 'u-attacker',
      patientId: 'p-cardio-01',
      action: 'TAMPERED_ACTION',
      activeWard: 'w-cardio',
      payloadHash: '1111111111111111111111111111111111111111111111111111111111111111',
      timestamp: new Date().toISOString(),
    };

    await expect(
      mergeOfflineAuditBranch({
        branchHeadHash: corruptBlock.blockHash,
        blocks: [corruptBlock],
        syncedByUserId: 'u-attacker',
        syncedFromWard: 'w-cardio',
      })
    ).rejects.toThrow(/Cryptographic integrity violation/);
  });
});
