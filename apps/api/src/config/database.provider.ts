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
    const { db, pool } = createDb(env.DATABASE_URL);
    this.db = db;
    this.pool = pool;
  }

  /** Gracefully close the pool on shutdown. */
  async close(): Promise<void> {
    await this.pool.end();
  }
}