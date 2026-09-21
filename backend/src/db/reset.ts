import { dbPrimary } from './clientPrimary.js';
import { dbAudit } from './clientAudit.js';
import { sql } from 'drizzle-orm';

export async function resetDatabase() {
  console.log('🧹 [RESET] Starting clean database purge...');

  // 1. Purge Primary Database Tables with CASCADE
  console.log('🗑️ [PRIMARY DB] Truncating operational tables in avecinna_primary_db...');
  await dbPrimary.execute(sql`
    DO $$ 
    BEGIN
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'security_alerts') THEN
        TRUNCATE TABLE security_alerts CASCADE;
      END IF;
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sessions') THEN
        TRUNCATE TABLE sessions CASCADE;
      END IF;
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'medical_documents') THEN
        TRUNCATE TABLE medical_documents CASCADE;
      END IF;
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lab_results') THEN
        TRUNCATE TABLE lab_results CASCADE;
      END IF;
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'care_teams') THEN
        TRUNCATE TABLE care_teams CASCADE;
      END IF;
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'outpatient_appointments') THEN
        TRUNCATE TABLE outpatient_appointments CASCADE;
      END IF;
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ward_rosters') THEN
        TRUNCATE TABLE ward_rosters CASCADE;
      END IF;
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patients') THEN
        TRUNCATE TABLE patients CASCADE;
      END IF;
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        TRUNCATE TABLE users CASCADE;
      END IF;
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'wards') THEN
        TRUNCATE TABLE wards CASCADE;
      END IF;
    END $$;
  `);
  console.log('✅ [PRIMARY DB] All operational tables truncated successfully.');

  // 2. Reset Isolated Audit Database (avecinna_audit_db)
  console.log('🗑️ [AUDIT DB] Resetting audit_blocks table in avecinna_audit_db...');
  await dbAudit.execute(sql`
    CREATE TABLE IF NOT EXISTS audit_blocks (
      index_num BIGSERIAL PRIMARY KEY,
      block_hash VARCHAR(64) NOT NULL UNIQUE,
      prev_hash VARCHAR(64) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      patient_id VARCHAR(36),
      action VARCHAR(50) NOT NULL,
      active_ward VARCHAR(36) NOT NULL,
      relationship_type VARCHAR(20),
      payload_hash VARCHAR(64) NOT NULL,
      ip_address VARCHAR(45),
      user_agent VARCHAR(500),
      device_type VARCHAR(30),
      device_info VARCHAR(150),
      http_method VARCHAR(10),
      request_path VARCHAR(255),
      execution_mode VARCHAR(20) DEFAULT 'MODE_A' NOT NULL,
      request_id VARCHAR(64),
      merkle_root VARCHAR(64),
      signature VARCHAR(256),
      secondary_parent_hash VARCHAR(64),
      is_offline_sync BOOLEAN DEFAULT FALSE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    TRUNCATE TABLE audit_blocks RESTART IDENTITY;
  `);
  console.log('✅ [AUDIT DB] audit_blocks table truncated and sequence reset to 1.');
}

// Direct execution support
if (import.meta.url === `file://${process.argv[1]}`) {
  resetDatabase()
    .then(() => {
      console.log('🎉 Database reset complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Database reset failed:', err);
      process.exit(1);
    });
}
