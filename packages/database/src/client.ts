import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as schema from './schema.js';

export type DB = ReturnType<typeof createDb>;

/**
 * Automatically apply any pending migrations from the migrations folder.
 */
export async function autoMigrate(db: DB['db'], customFolder?: string): Promise<boolean> {
  const candidates = [
    customFolder,
    path.resolve(process.cwd(), 'drizzle'),
    path.resolve(process.cwd(), 'packages/database/drizzle'),
    path.resolve(process.cwd(), '../packages/database/drizzle'),
  ].filter(Boolean) as string[];

  let folder: string | null = null;
  for (const dir of candidates) {
    if (fs.existsSync(dir) && fs.existsSync(path.join(dir, 'meta/_journal.json'))) {
      folder = dir;
      break;
    }
  }

  if (!folder) {
    console.log('[db] No migrations folder found, skipping auto-migration.');
    return false;
  }

  try {
    console.log(`[db] Checking and applying migrations from ${folder}...`);
    await migrate(db, { migrationsFolder: folder });
    console.log('[db] Migrations are up to date.');
    return true;
  } catch (error) {
    console.error('[db] Auto-migration error:', error);
    throw error;
  }
}

/**
 * Create a Drizzle client backed by a `pg` Pool.
 * The pool is the single Postgres entry point for the API (pooled, lazy).
 */
export function createDb(connectionString: string) {
  const isRemote = !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1');
  const pool = new Pool({
    connectionString,
    max: 20,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  });
  const db = drizzle({ client: pool, schema });
  return { db, pool };
}

export * as schema from './schema.js';

/** SQL helper re-exports so consumers never need a direct drizzle-orm install. */
export { and, asc, desc, eq, inArray, isNull, like, lte, ne, not, or, sql } from 'drizzle-orm';