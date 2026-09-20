import {
  pgTable,
  bigserial,
  varchar,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

// Audit Ledger Table (Physically Isolated Database avecinna_audit_db)
export const auditBlocks = pgTable(
  'audit_blocks',
  {
    indexNum: bigserial('index_num', { mode: 'number' }).primaryKey(),
    blockHash: varchar('block_hash', { length: 64 }).notNull().unique(),
    prevHash: varchar('prev_hash', { length: 64 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    patientId: varchar('patient_id', { length: 36 }),
    action: varchar('action', { length: 50 }).notNull(),
    activeWard: varchar('active_ward', { length: 36 }).notNull(),
    relationshipType: varchar('relationship_type', { length: 20 }),
    payloadHash: varchar('payload_hash', { length: 64 }).notNull(), // SHA-256 hash of event JSON payload
    ipAddress: varchar('ip_address', { length: 45 }), // Client IPv4 or IPv6 address
    userAgent: varchar('user_agent', { length: 500 }), // Full User-Agent header string
    deviceType: varchar('device_type', { length: 30 }), // DESKTOP, TABLET, MOBILE, WORKSTATION, PROXY_GATEWAY
    deviceInfo: varchar('device_info', { length: 150 }), // Parsed browser & OS (e.g. Chrome on macOS)
    httpMethod: varchar('http_method', { length: 10 }), // HTTP method (GET, POST, etc.)
    requestPath: varchar('request_path', { length: 255 }), // Target request path/endpoint
    executionMode: varchar('execution_mode', { length: 20 }).default('MODE_A').notNull(), // MODE_A, MODE_B, MODE_C
    requestId: varchar('request_id', { length: 64 }), // Request correlation ID
    merkleRoot: varchar('merkle_root', { length: 64 }),
    signature: varchar('signature', { length: 256 }),
    secondaryParentHash: varchar('secondary_parent_hash', { length: 64 }), // Secondary parent for Merkle DAG merge commits
    isOfflineSync: boolean('is_offline_sync').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_audit_blocks_hash').on(table.blockHash),
    index('idx_audit_blocks_user').on(table.userId),
    index('idx_audit_blocks_ip').on(table.ipAddress),
    index('idx_audit_blocks_action').on(table.action),
  ]
);
