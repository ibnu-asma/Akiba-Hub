import { Inject,  Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../config/database.provider.js';
import { activityLogs, and, desc, lte, sql } from '@hub/database';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface AuditLogRow {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  description: string;
  createdAt: Date;
}

/**
 * Audit invariant (spec §12.2): every admin write appends an activity_logs row
 * that powers the HoA "Recent Actions" feed.
 */
@Injectable()
export class AuditService {
  constructor(@Inject(DatabaseProvider) private readonly db: DatabaseProvider) {}

  async record(input: {
    actorId: string;
    actorName: string;
    actorRole: string;
    action: AuditAction;
    entityType: string;
    entityId?: string;
    description: string;
  }): Promise<void> {
    await this.db.db
      .insert(activityLogs)
      .values({
        actorId: input.actorId,
        actorName: input.actorName,
        actorRole: input.actorRole,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        description: input.description,
      })
      .execute();
  }

  /** Descending chronological feed (Recent Actions). Cursor = createdAt (ISO). */
  async list(limit = 50, before?: string): Promise<AuditLogRow[]> {
    const rows = await this.db.db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(Math.min(limit, 200))
      .where(before ? and(lte(activityLogs.createdAt, sql`${before}`)) : sql`true`)
      .execute();
    return rows as AuditLogRow[];
  }
}