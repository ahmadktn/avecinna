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
    merkleRoot: varchar('merkle_root', { length: 64 }),
    signature: varchar('signature', { length: 256 }),
    isOfflineSync: boolean('is_offline_sync').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_audit_blocks_hash').on(table.blockHash),
    index('idx_audit_blocks_user').on(table.userId),
  ]
);
