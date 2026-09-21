import { Injectable, Scope } from '@nestjs/common';
import { createDb, DB } from '@hub/database';
import { env } from './env.js';

/**
 * Database infra provider — owns the pg pool + Drizzle client lifecycle.
 * Registered once (Scope.DEFAULT) in AppModule.
 */
@Injectable({ scope: Scope.DEFAULT })
export class DatabaseProvider {
  readonly db: DB['db'];
  readonly pool: DB['pool'];

  constructor() {
    try {
      const u = new URL(env.DATABASE_URL);
      console.log(`[db] connecting to ${u.protocol}//${u.username ? u.username + '@' : ''}${u.host}${u.pathname}`);
    } catch {
      console.log(`[db] connecting with connection string (masked): ${env.DATABASE_URL.substring(0, 15)}...`);
    }
    const { db, pool } = createDb(env.DATABASE_URL);
    this.db = db;
    this.pool = pool;
  }

  /** Gracefully close the pool on shutdown. */
  async close(): Promise<void> {
    await this.pool.end();
  }
}