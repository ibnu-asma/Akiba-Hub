import bcrypt from 'bcryptjs';
import {
  Inject, Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../config/database.provider.js';
import { users, groups, invitations, problems, submissions, and, asc, eq, sql, isNull, inArray } from '@hub/database';
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
  constructor(@Inject(DatabaseProvider) private readonly db: DatabaseProvider, @Inject(AuditService) private readonly audit: AuditService, ) {}

  /** Active users. When `limit` is provided, returns a paged result with a total count. */
  async list(scope: DataScope, opts?: ListUsersOpts): Promise<UserSummary[] | Paged<UserSummary>> {
    const conditions: ReturnType<typeof sql>[] = [eq(users.isRemoved, false)];
    if (!scope.isGlobal && scope.groupIds.length > 0) {
      conditions.push(inArray(users.groupId, scope.groupIds));
    }
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

  async getById(id: string) {
    const row = await this.db.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        groupId: users.groupId,
        rating: users.rating,
        avatarUrl: users.avatarUrl,
        country: users.country,
        university: users.university,
        department: users.department,
        instagram: users.instagram,
        linkedin: users.linkedin,
        github: users.github,
        studentId: users.studentId,
        bio: users.bio,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.id, id), eq(users.isRemoved, false)))
      .limit(1)
      .execute();
    if (!row[0]) throw DomainError.notFound(`User ${id}`);
    return row[0];
  }

  async search(q?: string) {
    const query = q?.trim().toLowerCase() ?? '';
    const pattern = `%${query}%`;

    // 1. Search Users (active)
    const userConditions: ReturnType<typeof sql>[] = [eq(users.isRemoved, false)];
    if (query) {
      userConditions.push(
        sql`(lower(${users.name}) like ${pattern} or lower(${users.email}) like ${pattern} or lower(coalesce(${users.university}, '')) like ${pattern})`,
      );
    }

    const userRows = await this.db.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        groupId: users.groupId,
        groupName: groups.name,
        avatarUrl: users.avatarUrl,
        university: users.university,
      })
      .from(users)
      .leftJoin(groups, eq(users.groupId, groups.id))
      .where(and(...userConditions))
      .orderBy(asc(users.name))
      .limit(30)
      .execute();

    const seenEmails = new Set(userRows.map((u) => u.email.toLowerCase()));

    // 2. Search Invitations (for pending / invited scholars like Geleta Daba)
    let inviteItems: {
      id: string;
      name: string;
      email: string;
      role: string;
      groupId: string | null;
      groupName: string;
      avatarUrl: string | null;
      isInvited: boolean;
    }[] = [];

    if (query) {
      const inviteRows = await this.db.db
        .select({
          id: invitations.id,
          firstName: invitations.firstName,
          lastName: invitations.lastName,
          email: invitations.email,
          role: invitations.role,
          groupId: invitations.groupId,
          groupName: groups.name,
        })
        .from(invitations)
        .leftJoin(groups, eq(invitations.groupId, groups.id))
        .where(
          sql`(lower(coalesce(${invitations.firstName}, '')) like ${pattern} or lower(coalesce(${invitations.lastName}, '')) like ${pattern} or lower(coalesce(${invitations.email}, '')) like ${pattern})`,
        )
        .limit(15)
        .execute();

      inviteItems = inviteRows
        .filter((inv) => inv.email && !seenEmails.has(inv.email.toLowerCase()))
        .map((inv) => ({
          id: inv.id,
          name: [inv.firstName, inv.lastName].filter(Boolean).join(' ') || inv.email || 'Invited Scholar',
          email: inv.email || '',
          role: inv.role,
          groupId: inv.groupId,
          groupName: inv.groupName ?? 'Invited Scholar',
          avatarUrl: null,
          isInvited: true,
        }));
    }

    const students = [
      ...userRows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        groupId: u.groupId,
        groupName: u.groupName ?? 'Student',
        avatarUrl: u.avatarUrl,
        isInvited: false,
      })),
      ...inviteItems,
    ];

    // 3. Search Problems
    const problemConditions: ReturnType<typeof sql>[] = [isNull(problems.deletedAt)];
    if (query) {
      problemConditions.push(
        sql`(lower(${problems.name}) like ${pattern} or lower(${problems.platform}) like ${pattern} or lower(${problems.difficulty}) like ${pattern})`,
      );
    }

    const problemRows = await this.db.db
      .select({
        id: problems.id,
        name: problems.name,
        platform: problems.platform,
        difficulty: problems.difficulty,
        link: problems.link,
      })
      .from(problems)
      .where(and(...problemConditions))
      .orderBy(asc(problems.name))
      .limit(30)
      .execute();

    return {
      students,
      problems: problemRows,
    };
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

  
  async resetPassword(userId: string, newPassword: string, actor: ActorRef): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.db.db.update(users).set({ passwordHash }).where(eq(users.id, userId)).execute();
    
    
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

  async getStats(userId: string) {
    const rows = await this.db.db
      .select({
        solvedCount: sql<number>`count(distinct ${submissions.problemId})::int`,
        totalMinutes: sql<number>`coalesce(sum(${submissions.timeSpentMin}), 0)::int`,
        totalTries: sql<number>`coalesce(sum(${submissions.tries}), 0)::int`,
        totalSubmissions: sql<number>`count(*)::int`,
      })
      .from(submissions)
      .where(eq(submissions.userId, userId))
      .execute();

    return rows[0] ?? {
      solvedCount: 0,
      totalMinutes: 0,
      totalTries: 0,
      totalSubmissions: 0,
    };
  }
}