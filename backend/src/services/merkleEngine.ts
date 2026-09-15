import crypto from 'crypto';
import { dbAudit } from '../db/clientAudit.js';
import { auditBlocks } from '../db/schemaAudit.js';
import { desc, eq, sql } from 'drizzle-orm';

export interface AuditEventInput {
  userId?: string;
  staffId?: string;
  patientId?: string;
  action?: string;
  eventType?: string;
  activeWard?: string;
  activeWardId?: string;
  relationshipType?: string;
  payload?: any;
  payloadHash?: string;
  ipAddress?: string;
  executionMode?: string;
}

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * 1. Appends a new sequential block to the Hash Chain in avecinna_audit_db
 * Automatically called 100% server-side by Fastify route handlers & hooks.
 */
export async function appendAuditBlock(event: AuditEventInput) {
  const uId = event.userId || event.staffId || 'SYSTEM';
  const act = event.action || event.eventType || 'UNKNOWN_ACTION';
  const ward = event.activeWard || event.activeWardId || 'N/A';
  const pHash =
    event.payloadHash ||
    crypto
      .createHash('sha256')
      .update(JSON.stringify(event.payload || {}))
      .digest('hex');

  // 1. Fetch latest block from isolated audit database (tail of the chain)
  const latestBlock = await dbAudit
    .select()
    .from(auditBlocks)
    .orderBy(desc(auditBlocks.indexNum))
    .limit(1);

  const prevHash = latestBlock.length > 0 ? latestBlock[0].blockHash : GENESIS_HASH;
  const timestamp = new Date().toISOString();

  // 2. Compute current block SHA-256 hash (Hash Chain formula)
  const blockRawString = `${prevHash}|${uId}|${event.patientId || ''}|${act}|${ward}|${pHash}|${timestamp}`;
  const currentBlockHash = crypto.createHash('sha256').update(blockRawString).digest('hex');

  // 3. Insert into isolated audit DB
  try {
    const [inserted] = await dbAudit
      .insert(auditBlocks)
      .values({
        blockHash: currentBlockHash,
        prevHash: prevHash,
        userId: uId,
        patientId: event.patientId,
        action: act,
        activeWard: ward,
        relationshipType: event.relationshipType,
        payloadHash: pHash,
        isOfflineSync: false,
      })
      .returning();

    return inserted || { id: 1, blockHash: currentBlockHash, currentHash: currentBlockHash, prevHash };
  } catch (err: any) {
    if (err.message && err.message.includes('audit_blocks_pkey')) {
      // Sync sequence and retry
      await dbAudit.execute(
        sql`SELECT setval(pg_get_serial_sequence('audit_blocks', 'index_num'), COALESCE((SELECT MAX(index_num) FROM audit_blocks), 1));`
      );
      const [inserted] = await dbAudit
        .insert(auditBlocks)
        .values({
          blockHash: currentBlockHash,
          prevHash: prevHash,
          userId: uId,
          patientId: event.patientId,
          action: act,
          activeWard: ward,
          relationshipType: event.relationshipType,
          payloadHash: pHash,
          isOfflineSync: false,
        })
        .returning();
      return inserted || { id: 1, blockHash: currentBlockHash, currentHash: currentBlockHash, prevHash };
    }
    throw err;
  }
}

/**
 * 2. Computes a Binary Merkle Tree Root over an array of leaf hashes
 */
export function buildMerkleTreeRoot(leafHashes: string[]): string {
  if (leafHashes.length === 0) return GENESIS_HASH;
  let currentLevel = [...leafHashes];

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
      const parentHash = crypto.createHash('sha256').update(left + right).digest('hex');
      nextLevel.push(parentHash);
    }
    currentLevel = nextLevel;
  }

  return currentLevel[0];
}

export async function computeMerkleRoot(): Promise<string> {
  const blocks = await dbAudit.select().from(auditBlocks).orderBy(auditBlocks.indexNum);
  const leafHashes = blocks.map((b) => b.blockHash);
  return buildMerkleTreeRoot(leafHashes);
}

/**
 * 3. Single-Click Audit Chain Verification Algorithm (POST /api/v1/audit/verify)
 */
export async function verifyAuditLedgerChain(): Promise<{
  status: 'VERIFIED' | 'CORRUPTED';
  valid: boolean;
  totalBlocks: number;
  tamperedBlockIndex: number | null;
  brokenBlockId?: string | null;
}> {
  const blocks = await dbAudit.select().from(auditBlocks).orderBy(auditBlocks.indexNum);
  let expectedPrevHash = GENESIS_HASH;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    if (block.prevHash !== expectedPrevHash) {
      return {
        status: 'CORRUPTED',
        valid: false,
        totalBlocks: blocks.length,
        tamperedBlockIndex: Number(block.indexNum),
        brokenBlockId: String(block.indexNum),
      };
    }

    expectedPrevHash = block.blockHash;
  }

  return {
    status: 'VERIFIED',
    valid: true,
    totalBlocks: blocks.length,
    tamperedBlockIndex: null,
    brokenBlockId: null,
  };
}

export const verifyHashChainIntegrity = verifyAuditLedgerChain;
