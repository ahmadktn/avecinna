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

/**
 * 4. Merkle Tree Visualizer Data Structure
 * Builds a multi-level hierarchical tree model for interactive chart rendering in Admin UI.
 */
export interface MerkleNode {
  id: string;
  hash: string;
  shortHash: string;
  level: number;
  label: string;
  isLeaf: boolean;
  blockIndex?: number;
  action?: string;
  actor?: string;
  patientId?: string | null;
  activeWard?: string;
  payloadHash?: string;
  prevHash?: string;
  timestamp?: string;
  children?: string[]; // IDs of child nodes
  parentId?: string;
}

export async function getMerkleTreeHierarchy(): Promise<{
  root: string;
  totalLeaves: number;
  levels: MerkleNode[][];
  nodes: Record<string, MerkleNode>;
}> {
  const blocks = await dbAudit.select().from(auditBlocks).orderBy(auditBlocks.indexNum);
  if (blocks.length === 0) {
    const rootNode: MerkleNode = {
      id: 'root-0',
      hash: GENESIS_HASH,
      shortHash: GENESIS_HASH.slice(0, 10) + '...',
      level: 0,
      label: 'Genesis Root',
      isLeaf: true,
    };
    return {
      root: GENESIS_HASH,
      totalLeaves: 0,
      levels: [[rootNode]],
      nodes: { 'root-0': rootNode },
    };
  }

  const nodesMap: Record<string, MerkleNode> = {};
  
  // Build Level 0 (Leaves from audit blocks)
  let currentLevelNodes: MerkleNode[] = blocks.map((b) => {
    const id = `leaf-${b.indexNum}`;
    const node: MerkleNode = {
      id,
      hash: b.blockHash,
      shortHash: `${b.blockHash.slice(0, 8)}...${b.blockHash.slice(-6)}`,
      level: 0,
      label: `Block #${b.indexNum} [${b.action}]`,
      isLeaf: true,
      blockIndex: b.indexNum,
      action: b.action,
      actor: b.userId,
      patientId: b.patientId,
      activeWard: b.activeWard,
      payloadHash: b.payloadHash,
      prevHash: b.prevHash,
      timestamp: b.createdAt.toISOString(),
    };
    nodesMap[id] = node;
    return node;
  });

  const allLevels: MerkleNode[][] = [currentLevelNodes];
  let currentLevelIdx = 1;

  while (currentLevelNodes.length > 1) {
    const nextLevelNodes: MerkleNode[] = [];

    for (let i = 0; i < currentLevelNodes.length; i += 2) {
      const left = currentLevelNodes[i];
      const right = i + 1 < currentLevelNodes.length ? currentLevelNodes[i + 1] : left;
      const combinedHash = crypto.createHash('sha256').update(left.hash + right.hash).digest('hex');
      const parentId = `node-L${currentLevelIdx}-${Math.floor(i / 2)}`;

      const parentNode: MerkleNode = {
        id: parentId,
        hash: combinedHash,
        shortHash: `${combinedHash.slice(0, 8)}...${combinedHash.slice(-6)}`,
        level: currentLevelIdx,
        label: `Branch L${currentLevelIdx}.${Math.floor(i / 2) + 1}`,
        isLeaf: false,
        children: left.id === right.id ? [left.id] : [left.id, right.id],
      };

      left.parentId = parentId;
      if (left.id !== right.id) {
        right.parentId = parentId;
      }

      nodesMap[parentId] = parentNode;
      nextLevelNodes.push(parentNode);
    }

    allLevels.push(nextLevelNodes);
    currentLevelNodes = nextLevelNodes;
    currentLevelIdx++;
  }

  const rootHash = currentLevelNodes.length > 0 ? currentLevelNodes[0].hash : GENESIS_HASH;

  return {
    root: rootHash,
    totalLeaves: blocks.length,
    levels: allLevels.reverse(), // Top-down: Root at index 0, Leaves at bottom
    nodes: nodesMap,
  };
}

/**
 * 5. Comprehensive Ledger Analysis & Anomaly Detection
 */
export async function getAuditLedgerAnalytics() {
  const blocks = await dbAudit.select().from(auditBlocks).orderBy(desc(auditBlocks.indexNum));
  const verification = await verifyHashChainIntegrity();
  const merkleRoot = await computeMerkleRoot();

  // Action Distribution Breakdown
  const actionCounts: Record<string, number> = {};
  const wardCounts: Record<string, number> = {};
  const userCounts: Record<string, number> = {};
  const timelineCounts: Record<string, number> = {}; // YYYY-MM-DD

  for (const b of blocks) {
    actionCounts[b.action] = (actionCounts[b.action] || 0) + 1;
    wardCounts[b.activeWard] = (wardCounts[b.activeWard] || 0) + 1;
    userCounts[b.userId] = (userCounts[b.userId] || 0) + 1;

    const dateKey = b.createdAt.toISOString().split('T')[0];
    timelineCounts[dateKey] = (timelineCounts[dateKey] || 0) + 1;
  }

  // Automated Anomaly Detection / Smart Flagging
  const flaggedEvents = [];
  for (const b of blocks) {
    const flags: string[] = [];
    let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

    if (b.action.includes('BREAK_GLASS_TIER2') || b.action.includes('EMERGENCY_OVERRIDE')) {
      flags.push('Emergency Tier-2 full chart unlock activated');
      severity = 'CRITICAL';
    } else if (b.action.includes('UNAUTHORIZED') || b.action.includes('FORBIDDEN') || b.action.includes('ADMIN_CLINICAL')) {
      flags.push('Unauthorized cross-ward / admin access attempt');
      severity = 'HIGH';
    } else if (b.action.includes('BREAK_GLASS_TIER1')) {
      flags.push('Tier-1 Instant resuscitation summary accessed');
      severity = 'MEDIUM';
    } else if (b.action.includes('USER_STATUS_TOGGLE') || b.action.includes('ADMIN_USER_UPDATE')) {
      flags.push('Administrative privilege modification');
      severity = 'MEDIUM';
    }

    if (flags.length > 0) {
      flaggedEvents.push({
        blockIndex: b.indexNum,
        blockHash: b.blockHash,
        prevHash: b.prevHash,
        userId: b.userId,
        patientId: b.patientId,
        action: b.action,
        activeWard: b.activeWard,
        payloadHash: b.payloadHash,
        createdAt: b.createdAt.toISOString(),
        flags,
        severity,
      });
    }
  }

  return {
    verification: {
      valid: verification.valid,
      status: verification.status,
      totalBlocks: blocks.length,
      merkleRoot,
      brokenBlockId: verification.brokenBlockId,
    },
    metrics: {
      totalBlocks: blocks.length,
      flaggedCount: flaggedEvents.length,
      uniqueUsersCount: Object.keys(userCounts).length,
      uniqueWardsCount: Object.keys(wardCounts).length,
    },
    actionDistribution: actionCounts,
    wardDistribution: wardCounts,
    topActors: Object.entries(userCounts)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    timeline: Object.entries(timelineCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    flaggedEvents,
  };
}

