import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import dotenv from 'dotenv';
import * as schema from './schemaAudit.js';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL_AUDIT ||
  'postgres://postgres:postgres@localhost:5432/avecinna_audit_db';

export const poolAudit = new pg.Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const dbAudit = drizzle(poolAudit, { schema });
