import crypto from 'crypto';
import pg from 'pg';

export interface LogAuditBlockOptions {
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
  executionMode?: 'MODE_C';
}

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export class AuditLogger {
  private pool: pg.Pool;

  constructor(auditDbUrl: string) {
    if (!auditDbUrl) {
      throw new Error(
        'AUDIT_DB_UNCONFIGURED: auditDbUrl is required for @avecina/security-middleware isolated audit ledger.'
      );
    }
    this.pool = new pg.Pool({
      connectionString: auditDbUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  /**
   * Appends an immutable SHA-256 block to avecinna_audit_db hash chain with execution_mode = 'MODE_C'
   */
  async appendBlock(opts: LogAuditBlockOptions): Promise<{ blockHash: string; prevHash: string; indexNum: number }> {
    const client = await this.pool.connect();
    try {
      // 1. Fetch latest block to get tail prev_hash
      const latestRes = await client.query(
        `SELECT index_num, block_hash FROM audit_blocks ORDER BY index_num DESC LIMIT 1`
      );

      const prevHash = latestRes.rows.length > 0 ? latestRes.rows[0].block_hash : GENESIS_HASH;
      const timestamp = new Date().toISOString();

      const pHash =
        opts.payloadHash ||
        crypto
          .createHash('sha256')
          .update(JSON.stringify(opts.payload || {}))
          .digest('hex');

      const ip = (opts.ipAddress || '127.0.0.1').slice(0, 45);
      const uId = (opts.userId || 'SYSTEM').slice(0, 36);
      const patId = opts.patientId ? opts.patientId.slice(0, 36) : null;
      const act = (opts.action || 'CUSTOM_ACTION').slice(0, 50);
      const ward = (opts.activeWard || 'N/A').slice(0, 36);

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
          opts.relationshipType ? opts.relationshipType.slice(0, 20) : null,
          pHash,
          ip,
          (opts.userAgent || 'Mode C SDK Client').slice(0, 500),
          (opts.deviceType || 'SDK_MICROSERVICE').slice(0, 30),
          (opts.deviceInfo || 'Embedded Node.js Microservice').slice(0, 150),
          (opts.httpMethod || 'HTTP').slice(0, 10),
          (opts.requestPath || '').slice(0, 255),
          'MODE_C',
          (opts.requestId || crypto.randomUUID()).slice(0, 64),
        ]
      );

      const indexNum = Number(insertRes.rows[0].index_num);
      return { blockHash, prevHash, indexNum };
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}
