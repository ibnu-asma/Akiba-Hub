import { Inject,  Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../config/database.provider.js';
import { desc, eq, inArray, problems, sql, submissions, users } from '@hub/database';
import { ROLES } from '@hub/shared';
import { DataScope } from '../../common/auth/scope.service.js';

export interface CreateSubmissionInput {
  problemId: string;
  language: string;
  code?: string | null;
  timeSpentMin: number;
  tries: number;
  source: string;
  contestProblemId?: string | null;
}

/**
 * Submissions — students log solves (manual form or extension); the feed is
 * role-scoped (self / group / platform) per the 3-level invariant (spec §12.4).
 */
@Injectable()
export class SubmissionsService {
  constructor(@Inject(DatabaseProvider) private readonly db: DatabaseProvider) {}

  async create(input: CreateSubmissionInput, actor: { id: string }) {
    const rows = await this.db.db
      .insert(submissions)
      .values({
        userId: actor.id,
        problemId: input.problemId,
        language: input.language,
        code: input.code ?? null,
        timeSpentMin: input.timeSpentMin,
        tries: input.tries,
        source: input.source,
        contestProblemId: input.contestProblemId ?? null,
      })
      .returning()
      .execute();
    return rows[0]!;
  }

  /**
   * All distinct problem IDs solved within the caller's scope:
   * - Student: problems solved by this student
   * - HoE: problems solved by any student in their supervised groups
   * - HoA: problems solved across the academy
   */
  async solvedProblemIds(scope: DataScope, actorId: string): Promise<string[]> {
    let query = this.db.db
      .selectDistinct({ problemId: submissions.problemId })
      .from(submissions)
      .$dynamic();

    if (scope.role === ROLES.headOfAcademy || scope.isGlobal) {
      // Platform-wide distinct solved problems
    } else if (scope.role === ROLES.headOfEducation) {
      if (scope.groupIds.length === 0) return [];
      query = query
        .innerJoin(users, eq(submissions.userId, users.id))
        .where(inArray(users.groupId, scope.groupIds));
    } else {
      query = query.where(eq(submissions.userId, actorId));
    }

    const rows = await query.execute();
    return rows.map((r) => r.problemId);
  }

  /** Newest-first feed joined with student + problem names (SPEC §7.13, §6.2). */
  async list(scope: DataScope, actorId: string, limit: number, opts: { group?: boolean; problemId?: string; userId?: string } = {}) {
    let query = this.db.db
      .select({
        id: submissions.id,
        userId: submissions.userId,
        userName: users.name,
        avatarUrl: users.avatarUrl,
        problemId: submissions.problemId,
        problemName: problems.name,
        problemLink: problems.link,
        language: submissions.language,
        code: submissions.code,
        timeSpentMin: submissions.timeSpentMin,
        tries: submissions.tries,
        source: submissions.source,
        createdAt: submissions.createdAt,
      })
      .from(submissions)
      .innerJoin(users, eq(submissions.userId, users.id))
      .innerJoin(problems, eq(submissions.problemId, problems.id))
      .$dynamic();

    if (opts.problemId) {
      query = query.where(eq(submissions.problemId, opts.problemId));
    }

    if (opts.userId) {
      if (opts.userId !== actorId && !scope.isGlobal) {
        query = query.where(inArray(users.groupId, scope.groupIds));
      }
      query = query.where(eq(submissions.userId, opts.userId));
    } else if (opts.group) {
      // Group-wide feed (student → their group, HoE → headed groups, HoA → all).
      if (!scope.isGlobal) query = query.where(inArray(users.groupId, scope.groupIds));
    } else if (scope.role === ROLES.headOfEducation) {
      query = query.where(inArray(users.groupId, scope.groupIds));
    } else if (scope.role !== ROLES.headOfAcademy) {
      query = query.where(eq(submissions.userId, actorId));
    }

    return query.orderBy(desc(submissions.createdAt)).limit(Math.min(Math.max(limit, 1), 200)).execute();
  }

  /**
   * Distinct solvers per problem, scoped to the caller's group visibility
   * (student → their group, HoE → headed groups, HoA → all). Powers the
   * solver avatar stack on problem cards.
   */
  async solvers(scope: DataScope): Promise<Record<string, { userId: string; name: string; avatarUrl: string | null }[]>> {
    const rows = await this.db.db
      .select({
        problemId: submissions.problemId,
        userId: submissions.userId,
        name: users.name,
        avatarUrl: users.avatarUrl,
      })
      .from(submissions)
      .innerJoin(users, eq(submissions.userId, users.id))
      .where(scope.isGlobal ? sql`true` : inArray(users.groupId, scope.groupIds))
      .execute();

    const byProblem = new Map<string, Map<string, { userId: string; name: string; avatarUrl: string | null }>>();
    const result: Record<string, { userId: string; name: string; avatarUrl: string | null }[]> = {};
    for (const row of rows) {
      const seen = byProblem.get(row.problemId) ?? new Map<string, { userId: string; name: string; avatarUrl: string | null }>();
      seen.set(row.userId, { userId: row.userId, name: row.name, avatarUrl: row.avatarUrl });
      byProblem.set(row.problemId, seen);
      result[row.problemId] = [...seen.values()];
    }
    return result;
  }
}
