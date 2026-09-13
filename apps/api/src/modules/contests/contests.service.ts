import { Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../config/database.provider.js';
import { contestGroups, contestProblems, contests, desc, eq, groups, problems, and, inArray, isNull, sql } from '@hub/database';
import { AuditService } from '../../common/audit/audit.service.js';
import { DomainError } from '@hub/shared';

export interface CreateContestInput {
  name: string;
  number?: number | null;
  type: string;
  unrated: boolean;
  date: string;
  standingsLink?: string | null;
  groupIds: string[];
}

export interface ListContestsOptions {
  q?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Contests — HoE/HoA schedule + attach questions, every role reads (spec §6.8 / §7.7). */
@Injectable()
export class ContestsService {
  constructor(private readonly db: DatabaseProvider, private readonly audit: AuditService) {}

  async create(input: CreateContestInput, actor: { id: string; name: string; role: string }) {
    const rows = await this.db.db
      .insert(contests)
      .values({
        name: input.name,
        number: input.number ?? null,
        type: input.type,
        unrated: input.unrated,
        date: new Date(input.date),
        standingsLink: input.standingsLink ?? null,
        createdBy: actor.id,
      })
      .returning()
      .execute();
    const created = rows[0]!;

    if (input.groupIds.length > 0) {
      await this.db.db
        .insert(contestGroups)
        .values(input.groupIds.map((groupId) => ({ contestId: created.id, groupId })))
        .onConflictDoNothing()
        .execute();
    }

    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'CREATE',
      entityType: 'contest',
      entityId: created.id,
      description: `created the contest called '${input.name}'`,
    });
    return created;
  }

  /**
   * Attach questions to a contest — each gets the next free pseudo letter
   * (A, B, C…). Duplicates (same problem twice) are skipped silently.
   */
  async attachProblems(
    contestId: string,
    contestName: string,
    problemIds: string[],
    actor: { id: string; name: string; role: string },
  ) {
    const unique = [...new Set(problemIds)];
    const existing = await this.db.db
      .select({ problemId: contestProblems.problemId })
      .from(contestProblems)
      .where(eq(contestProblems.contestId, contestId))
      .execute();
    const alreadyIn = new Set(existing.map((row) => row.problemId));
    const pending = unique.filter((problemId) => !alreadyIn.has(problemId));

    // Assign letters after the highest used one (gaps are tolerated).
    const used = existing.length;
    if (pending.length > 0) {
      await this.db.db
        .insert(contestProblems)
        .values(
          pending.map((problemId, index) => ({
            contestId,
            pseudo: LETTERS[(used + index) % 26]!,
            problemId,
          })),
        )
        .onConflictDoNothing()
        .execute();
    }

    if (pending.length > 0) {
      await this.audit.record({
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action: 'UPDATE',
        entityType: 'contest',
        entityId: contestId,
        description: `attached ${pending.length} exercises to contest '${contestName}'`,
      });
    }
    return { added: pending.length };
  }

  /** Newest-first by scheduled date. Paginated {rows,total} when `limit` is given, else a plain array. */
  async list(opts: ListContestsOptions = {}) {
    const conditions = [isNull(contests.deletedAt)];
    if (opts.q) conditions.push(sql`${contests.name} ilike ${`%${opts.q}%`}`);
    if (opts.type) conditions.push(eq(contests.type, opts.type));
    const where = and(...conditions);

    const select = {
      id: contests.id,
      name: contests.name,
      number: contests.number,
      type: contests.type,
      unrated: contests.unrated,
      date: contests.date,
      standingsLink: contests.standingsLink,
      createdBy: contests.createdBy,
      createdAt: contests.createdAt,
    };

    if (opts.limit !== undefined) {
      const [rows, totalRows] = await Promise.all([
        this.db.db
          .select(select)
          .from(contests)
          .where(where)
          .orderBy(desc(contests.date))
          .limit(opts.limit)
          .offset(opts.offset ?? 0)
          .execute(),
        this.db.db
          .select({ count: sql<number>`count(*)::int` })
          .from(contests)
          .where(where)
          .execute(),
      ]);
      return { rows: await this.withGroupNames(await this.withCounts(rows)), total: totalRows[0]?.count ?? 0 };
    }

    const rows = await this.db.db.select(select).from(contests).where(where).orderBy(desc(contests.date)).limit(200).execute();
    return this.withGroupNames(await this.withCounts(rows));
  }

  /** Attach problem/group counts to rows. */
  private async withCounts<T extends { id: string }>(rows: T[]): Promise<(T & { problemCount: number; groupCount: number })[]> {
    const base = rows.map((r) => ({ ...r, problemCount: 0, groupCount: 0 }));
    if (rows.length === 0) return base;
    const ids = rows.map((r) => r.id);
    const [problemRows, groupRows] = await Promise.all([
      this.db.db
        .select({ contestId: contestProblems.contestId, count: sql<number>`count(*)::int` })
        .from(contestProblems)
        .where(inArray(contestProblems.contestId, ids))
        .groupBy(contestProblems.contestId)
        .execute(),
      this.db.db
        .select({ contestId: contestGroups.contestId, count: sql<number>`count(*)::int` })
        .from(contestGroups)
        .where(inArray(contestGroups.contestId, ids))
        .groupBy(contestGroups.contestId)
        .execute(),
    ]);
    const pMap = new Map(problemRows.map((r) => [r.contestId, r.count]));
    const gMap = new Map(groupRows.map((r) => [r.contestId, r.count]));
    return base.map((r) => ({
      ...r,
      problemCount: pMap.get(r.id) ?? 0,
      groupCount: gMap.get(r.id) ?? 0,
    }));
  }

  /** Attach participating group names/ids/superGroupIds to rows (for cards / lists + edit prefill). */
  private async withGroupNames<T extends { id: string }>(rows: T[]): Promise<(T & { groupNames: string[]; groupIds: string[]; superGroupIds: string[] })[]> {
    const base = rows.map((r) => ({ ...r, groupNames: [] as string[], groupIds: [] as string[], superGroupIds: [] as string[] }));
    if (rows.length === 0) return base;
    const ids = rows.map((r) => r.id);
    const joined = await this.db.db
      .select({
        contestId: contestGroups.contestId,
        groupId: contestGroups.groupId,
        name: groups.name,
        superGroupId: groups.superGroupId,
      })
      .from(contestGroups)
      .innerJoin(groups, eq(contestGroups.groupId, groups.id))
      .where(inArray(contestGroups.contestId, ids))
      .execute();
    const names = new Map<string, string[]>();
    const groupIds = new Map<string, string[]>();
    const superGroupIds = new Map<string, Set<string>>();
    for (const row of joined) {
      names.set(row.contestId, [...(names.get(row.contestId) ?? []), row.name]);
      groupIds.set(row.contestId, [...(groupIds.get(row.contestId) ?? []), row.groupId]);
      if (row.superGroupId) {
        const set = superGroupIds.get(row.contestId) ?? new Set<string>();
        set.add(row.superGroupId);
        superGroupIds.set(row.contestId, set);
      }
    }
    return base.map((r) => ({
      ...r,
      groupNames: names.get(r.id) ?? [],
      groupIds: groupIds.get(r.id) ?? [],
      superGroupIds: Array.from(superGroupIds.get(r.id) ?? []),
    }));
  }

  /** Get a single contest with counts and group info. */
  async findById(id: string) {
    const select = {
      id: contests.id,
      name: contests.name,
      number: contests.number,
      type: contests.type,
      unrated: contests.unrated,
      date: contests.date,
      standingsLink: contests.standingsLink,
      createdBy: contests.createdBy,
      createdAt: contests.createdAt,
    };
    const rows = await this.db.db
      .select(select)
      .from(contests)
      .where(and(eq(contests.id, id), isNull(contests.deletedAt)))
      .execute();
    if (!rows[0]) throw DomainError.notFound(`Contest ${id}`);
    const withCount = await this.withCounts(rows);
    const withGroups = await this.withGroupNames(withCount);
    return withGroups[0]!;
  }

  /** Edit a contest's core fields and participating groups (SPEC §7.7). */
  async update(id: string, input: CreateContestInput, actor: { id: string; name: string; role: string }) {
    const updated = await this.db.db
      .update(contests)
      .set({
        name: input.name,
        number: input.number ?? null,
        type: input.type,
        unrated: input.unrated,
        date: new Date(input.date),
        standingsLink: input.standingsLink ?? null,
      })
      .where(and(eq(contests.id, id), isNull(contests.deletedAt)))
      .returning()
      .execute();
    if (!updated[0]) throw DomainError.notFound(`Contest ${id}`);

    await this.db.db.delete(contestGroups).where(eq(contestGroups.contestId, id)).execute();
    if (input.groupIds.length > 0) {
      await this.db.db
        .insert(contestGroups)
        .values(input.groupIds.map((groupId) => ({ contestId: id, groupId })))
        .onConflictDoNothing()
        .execute();
    }

    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'UPDATE',
      entityType: 'contest',
      entityId: id,
      description: `updated the contest '${input.name}'`,
    });
    return updated[0];
  }

  /** Soft-delete a contest (SPEC §7.7 delete). */
  async softDelete(id: string, actor: { id: string; name: string; role: string }) {
    const updated = await this.db.db
      .update(contests)
      .set({ deletedAt: new Date() })
      .where(eq(contests.id, id))
      .returning()
      .execute();
    if (!updated[0]) throw DomainError.notFound(`Contest ${id}`);
    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'DELETE',
      entityType: 'contest',
      entityId: id,
      description: `deleted the contest '${updated[0].name}'`,
    });
  }

  /** List a contest's problems with their pseudo letters + problem details. */
  async listProblems(id: string) {
    return this.db.db
      .select({
        problemId: problems.id,
        pseudo: contestProblems.pseudo,
        name: problems.name,
        difficulty: problems.difficulty,
        platform: problems.platform,
        link: problems.link,
        tags: problems.tags,
        createdAt: problems.createdAt,
      })
      .from(contestProblems)
      .innerJoin(problems, eq(contestProblems.problemId, problems.id))
      .where(eq(contestProblems.contestId, id))
      .orderBy(contestProblems.pseudo)
      .execute();
  }

  /** Remove one problem from a contest (SPEC §7.7). */
  async removeProblem(contestId: string, problemId: string, actor: { id: string; name: string; role: string }) {
    await this.db.db
      .delete(contestProblems)
      .where(and(eq(contestProblems.contestId, contestId), eq(contestProblems.problemId, problemId)))
      .execute();
    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'DELETE',
      entityType: 'contest',
      entityId: contestId,
      description: 'removed a problem from a contest',
    });
    return { ok: true };
  }
}
