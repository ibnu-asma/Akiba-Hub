import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle config — reads the same DATABASE_URL the API uses.
 * SQL migrations are tracked under ./drizzle (drizzle/meta is gitignored).
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://hub:hub@localhost:5433/a2sv_hub',
  },
  verbose: true,
  strict: true,
});