import { Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../config/database.provider.js';
import { users, and, asc, eq, sql } from '@hub/database';
import { DomainError, ROLES } from '@hub/shared';
import { DataScope } from '../../common/auth/scope.service.js';
import { AuditService } from '../../common/audit/audit.service.js';

export interface ActorRef {
  id: string;
  name: string;
  role: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: string;
  groupId: string | null;
  isRemoved: boolean;
  rating: number;
  avatarUrl: string | null;
}

export interface ListUsersOpts {
  q?: string;
  role?: string;
  limit?: number;
  offset?: number;
}

export interface Paged<T> {
  rows: T[];
  total: number;
}

function toSummary(row: Record<string, unknown>): UserSummary {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as string,
    groupId: (row.groupId as string | null) ?? null,
    isRemoved: (row.isRemoved as boolean) ?? false,
    rating: (row.rating as number) ?? 1200,
    avatarUrl: (row.avatarUrl as string | null) ?? null,
  };
}

/** User administration use-cases — HoA only (spec §8.7: promote/demote/delete). */
@Injectable()
export class UsersService {
  constructor(
    private readonly db: DatabaseProvider,
    private readonly audit: AuditService,
  ) {}

  /** Active users. When `limit` is provided, returns a paged result with a total count. */
  async list(scope: DataScope, opts?: ListUsersOpts): Promise<UserSummary[] | Paged<UserSummary>> {
    // TODO(iteration 2): scope HoE to their groups via scope.groupIds.
    void scope;
    const conditions: ReturnType<typeof sql>[] = [eq(users.isRemoved, false)];
    if (opts?.role) conditions.push(eq(users.role, opts.role));
    if (opts?.q) {
      const pattern = `%${opts.q.toLowerCase()}%`;
      conditions.push(sql`(lower(${users.name}) like ${pattern} or lower(${users.email}) like ${pattern})`);
    }
    const where = and(...conditions);

    if (opts?.limit != null) {
      const [rows, countRows] = await Promise.all([
        this.db.db.select().from(users).where(where).orderBy(asc(users.name)).limit(opts.limit).offset(opts.offset ?? 0).execute(),
        this.db.db.select({ count: sql<number>`count(*)::int` }).from(users).where(where).execute(),
      ]);
      return { rows: rows.map(toSummary), total: countRows[0]?.count ?? 0 };
    }

    const rows = await this.db.db.select().from(users).where(where).orderBy(asc(users.name)).execute();
    return rows.map(toSummary);
  }

  async updateRole(userId: string, role: string, groupId: string | null, actor: ActorRef): Promise<UserSummary> {
    if (!(Object.values(ROLES) as string[]).includes(role)) {
      throw DomainError.validation(`Unknown role: ${role}`);
    }
    const rows = await this.db.db
      .update(users)
      .set({ role, groupId })
      .where(eq(users.id, userId))
      .returning()
      .execute();
    if (!rows[0]) throw DomainError.notFound(`User ${userId}`);
    const summary = toSummary(rows[0]);
    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'UPDATE',
      entityType: 'user',
      entityId: userId,
      description: `changed ${summary.name}'s role to ${role}`,
    });
    return summary;
  }

  async softDelete(userId: string, actor: ActorRef): Promise<void> {
    const before = await this.db.db.select().from(users).where(eq(users.id, userId)).limit(1).execute();
    const rows = await this.db.db
      .update(users)
      .set({ isRemoved: true, removedAt: new Date() })
      .where(eq(users.id, userId))
      .returning()
      .execute();
    if (!rows[0]) throw DomainError.notFound(`User ${userId}`);
    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'DELETE',
      entityType: 'user',
      entityId: userId,
      description: `deleted the user ${toSummary(before[0] as Record<string, unknown>).name}`,
    });
  }

  async listRemoved(opts?: { q?: string; limit?: number; offset?: number }): Promise<UserSummary[] | Paged<UserSummary>> {
    const conditions: ReturnType<typeof sql>[] = [eq(users.isRemoved, true)];
    if (opts?.q) {
      const pattern = `%${opts.q.toLowerCase()}%`;
      conditions.push(sql`(lower(${users.name}) like ${pattern} or lower(${users.email}) like ${pattern})`);
    }
    const where = and(...conditions);

    if (opts?.limit != null) {
      const [rows, countRows] = await Promise.all([
        this.db.db.select().from(users).where(where).orderBy(asc(users.name)).limit(opts.limit).offset(opts.offset ?? 0).execute(),
        this.db.db.select({ count: sql<number>`count(*)::int` }).from(users).where(where).execute(),
      ]);
      return { rows: rows.map(toSummary), total: countRows[0]?.count ?? 0 };
    }

    const rows = await this.db.db.select().from(users).where(where).orderBy(asc(users.name)).execute();
    return rows.map(toSummary);
  }
}