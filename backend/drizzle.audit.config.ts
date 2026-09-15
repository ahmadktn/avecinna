import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: './src/db/schemaAudit.ts',
  out: './drizzle/audit',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_AUDIT || 'postgres://postgres:postgres@localhost:5433/avecinna_audit_db',
  },
});
