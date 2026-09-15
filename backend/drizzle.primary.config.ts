import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: './src/db/schemaPrimary.ts',
  out: './drizzle/primary',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_PRIMARY || 'postgres://postgres:postgres@localhost:5432/avecinna_primary_db',
  },
});
