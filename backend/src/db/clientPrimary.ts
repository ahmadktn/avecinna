import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import dotenv from 'dotenv';
import * as schema from './schemaPrimary.js';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL_PRIMARY ||
  'postgres://postgres:postgres@localhost:5432/avecinna_primary_db';

export const poolPrimary = new pg.Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const dbPrimary = drizzle(poolPrimary, { schema });
