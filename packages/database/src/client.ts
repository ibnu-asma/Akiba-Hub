import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

export type DB = ReturnType<typeof createDb>;

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