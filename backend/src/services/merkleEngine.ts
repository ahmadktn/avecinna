import crypto from 'crypto';
import { dbAudit } from '../db/clientAudit.js';
import { auditBlocks } from '../db/schemaAudit.js';
import { desc, eq } from 'drizzle-orm';

export interface AuditEventInput {
  userId: string;
  patientId?: string;
  action: string;
  activeWard: string;
  relationshipType?: string;
  payload: any;
}

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * 1. Appends a new sequential block to the Hash Chain in avecinna_audit_db
 * Automatically called 100% server-side by Fastify route handlers & hooks.
 */
export async function appendAuditBlock(event: AuditEventInput): Promise<string> {
  // 1. Fetch latest block from isolated audit database (tail of the chain)
  const latestBlock = await dbAudit
    .select()
    .from(auditBlocks)
    .orderBy(desc(auditBlocks.indexNum))
    .limit(1);

  const prevHash = latestBlock.length > 0 ? latestBlock[0].blockHash : GENESIS_HASH;
  const timestamp = new Date().toISOString();

  // 2. Hash raw payload to protect ePHI in audit database
  const payloadHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(event.payload || {}))
    .digest('hex');

  // 3. Compute current block SHA-256 hash (Hash Chain formula)
  const blockRawString = `${prevHash}|${event.userId}|${event.patientId || ''}|${event.action}|${event.activeWard}|${payloadHash}|${timestamp}`;
  const currentBlockHash = crypto.createHash('sha256').update(blockRawString).digest('hex');

  // 4. Insert into isolated audit DB
  await dbAudit.insert(auditBlocks).values({
    blockHash: currentBlockHash,
    prevHash: prevHash,
    userId: event.userId,
    patientId: event.patientId,
    action: event.action,
    activeWard: event.activeWard,
    relationshipType: event.relationshipType,
    payloadHash: payloadHash,
    isOfflineSync: false,
  });

  return currentBlockHash;
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

/**
 * 3. Single-Click Audit Chain Verification Algorithm (POST /api/v1/audit/verify)
 */
export async function verifyAuditLedgerChain(): Promise<{
  status: 'VERIFIED' | 'CORRUPTED';
  totalBlocks: number;
  tamperedBlockIndex: number | null;
}> {
  const blocks = await dbAudit.select().from(auditBlocks).orderBy(auditBlocks.indexNum);
  let expectedPrevHash = GENESIS_HASH;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    if (block.prevHash !== expectedPrevHash) {
      return {
        status: 'CORRUPTED',
        totalBlocks: blocks.length,
        tamperedBlockIndex: Number(block.indexNum),
      };
    }

    expectedPrevHash = block.blockHash;
  }

  return {
    status: 'VERIFIED',
    totalBlocks: blocks.length,
    tamperedBlockIndex: null,
  };
}
