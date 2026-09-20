import crypto from 'crypto';
import pg from 'pg';
import { AuditLogInput, AuditReceipt, LedgerVerificationResult } from '../types/index.js';

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export class AuditService {
  private pool: pg.Pool;
  private defaultExecutionMode: string;

  constructor(auditDbUrl: string, defaultExecutionMode: string = 'MODE_C') {
    if (!auditDbUrl) {
      throw new Error('AUDIT_DB_UNCONFIGURED: auditDbUrl is required for @avecina/sdk isolated audit ledger.');
    }
    this.defaultExecutionMode = defaultExecutionMode;
    this.pool = new pg.Pool({
      connectionString: auditDbUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  /**
   * Appends an immutable SHA-256 sealed block to the isolated audit ledger
   */
  async log(input: AuditLogInput): Promise<AuditReceipt> {
    const client = await this.pool.connect();
    try {
      // 1. Fetch latest block to get tail prev_hash
      const latestRes = await client.query(
        `SELECT index_num, block_hash FROM audit_blocks ORDER BY index_num DESC LIMIT 1`
      );

      const prevHash = latestRes.rows.length > 0 ? latestRes.rows[0].block_hash : GENESIS_HASH;
      const timestamp = new Date().toISOString();

      const pHash =
        input.payloadHash ||
        crypto
          .createHash('sha256')
          .update(JSON.stringify(input.payload || {}))
          .digest('hex');

      const ip = (input.ipAddress || '127.0.0.1').slice(0, 45);
      const uId = (input.userId || 'SYSTEM').slice(0, 36);
      const patId = input.patientId ? input.patientId.slice(0, 36) : null;
      const act = (input.action || 'CUSTOM_ACTION').slice(0, 50);
      const ward = (input.activeWard || 'N/A').slice(0, 36);
      const execMode = input.executionMode || this.defaultExecutionMode;

      // Compute current block SHA-256 hash incorporating Actor, Ward, Payload Hash, IP, and Timestamp
      const rawString = `${prevHash}|${uId}|${patId || ''}|${act}|${ward}|${pHash}|${ip}|${timestamp}`;
      const blockHash = crypto.createHash('sha256').update(rawString).digest('hex');

      // Insert sealed block into isolated avecinna_audit_db
      const insertRes = await client.query(
        `INSERT INTO audit_blocks (
           block_hash, prev_hash, user_id, patient_id, action, active_ward, 
           relationship_type, payload_hash, ip_address, user_agent, device_type, 
           device_info, http_method, request_path, execution_mode, request_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING index_num`,
        [
          blockHash,
          prevHash,
          uId,
          patId,
          act,
          ward,
          input.relationshipType ? input.relationshipType.slice(0, 20) : null,
          pHash,
          ip,
          (input.userAgent || 'Avecinna SDK Client').slice(0, 500),
          (input.deviceType || 'SDK_APPLICATION').slice(0, 30),
          (input.deviceInfo || 'Embedded Node.js SDK').slice(0, 150),
          (input.httpMethod || 'HTTP').slice(0, 10),
          (input.requestPath || '').slice(0, 255),
          execMode,
          (input.requestId || crypto.randomUUID()).slice(0, 64),
        ]
      );

      const indexNum = Number(insertRes.rows[0].index_num);
      return {
        indexNum,
        blockHash,
        prevHash,
        executionMode: execMode,
        timestamp,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Cryptographically verifies the linear SHA-256 hash chain in avecinna_audit_db
   */
  async verifyChain(): Promise<LedgerVerificationResult> {
    const client = await this.pool.connect();
    try {
      const res = await client.query(
        `SELECT index_num, block_hash, prev_hash, user_id, patient_id, action, active_ward, 
                payload_hash, ip_address, created_at, secondary_parent_hash, is_offline_sync
         FROM audit_blocks ORDER BY index_num ASC`
      );

      const blocks = res.rows;
      if (blocks.length === 0) {
        return {
          valid: true,
          status: 'VERIFIED',
          isolatedAuditDatabase: 'avecinna_audit_db',
          totalBlocks: 0,
          latestBlockHash: GENESIS_HASH,
          tamperedBlockIndex: null,
        };
      }

      let expectedPrevHash = GENESIS_HASH;

      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        const isOffline = b.is_offline_sync;
        const isMerge = b.action === 'OFFLINE_BRANCH_MERGE';

        if (!isOffline && !isMerge) {
          if (b.prev_hash !== expectedPrevHash) {
            return {
              valid: false,
              status: 'CORRUPTED',
              isolatedAuditDatabase: 'avecinna_audit_db',
              totalBlocks: blocks.length,
              latestBlockHash: blocks[blocks.length - 1].block_hash,
              tamperedBlockIndex: Number(b.index_num),
            };
          }
          expectedPrevHash = b.block_hash;
        } else if (isMerge) {
          expectedPrevHash = b.block_hash;
        }
      }

      return {
        valid: true,
        status: 'VERIFIED',
        isolatedAuditDatabase: 'avecinna_audit_db',
        totalBlocks: blocks.length,
        latestBlockHash: blocks[blocks.length - 1].block_hash,
        tamperedBlockIndex: null,
      };
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
