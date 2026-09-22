import { Inject,  Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../config/database.provider.js';
import {
  attendanceRecords,
  contestProblems,
  contests,
  divisions,
  eq,
  groups,
  inArray,
  problems,
  sql,
  submissions,
  trackProblems,
  tracks,
  users,
} from '@hub/database';
import { DataScope } from '../../common/auth/scope.service.js';

type Student = { id: string; name: string; groupId: string | null; rating: number; avatarUrl: string | null };
type SQLFragment = ReturnType<typeof sql>;

/**
 * Summary reporting hub (SPEC §7.10, §7.11) — read-only aggregation over the
 * existing tables. HoE sees their groups, HoA sees every group. Every method
 * is scoped so a head never sees another supergroup's students (§12.4).
 */
@Injectable()
export class SummaryService {
  constructor(@Inject(DatabaseProvider) private readonly db: DatabaseProvider) {}

  /** `users.groupId IN scope.groupIds`, or true when global (HoA). */
  private scoped(scope: DataScope): SQLFragment {
    return scope.isGlobal ? sql`true` : inArray(users.groupId, scope.groupIds);
  }

  private async students(scope: DataScope): Promise<Student[]> {
    return this.db.db
      .select({ id: users.id, name: users.name, groupId: users.groupId, rating: users.rating, avatarUrl: users.avatarUrl })
      .from(users)
      .where(sql`${users.role} = 'student' AND (${this.scoped(scope)})`)
      .orderBy(users.name)
      .execute();
  }

  /** Attendance — per-student counts + present % (SPEC §7.10.1). */
  async attendance(scope: DataScope) {
    const rows = await this.db.db
      .select({ userId: attendanceRecords.userId, status: attendanceRecords.status })
      .from(attendanceRecords)
      .innerJoin(users, eq(attendanceRecords.userId, users.id))
      .where(sql`${users.role} = 'student' AND (${this.scoped(scope)})`)
      .execute();

    const students = await this.students(scope);
    const byUser = new Map<string, Record<string, number>>();
    for (const row of rows) {
      const bucket = byUser.get(row.userId) ?? {};
      bucket[row.status] = (bucket[row.status] ?? 0) + 1;
      byUser.set(row.userId, bucket);
    }

    return students
      .map((s) => {
        const b = byUser.get(s.id) ?? {};
        const present = b['present'] ?? 0;
        const absent = b['absent'] ?? 0;
        const excused = b['excused'] ?? 0;
        const late = b['late'] ?? 0;
        const total = present + absent + excused + late;
        return {
          userId: s.id,
          name: s.name,
          avatarUrl: s.avatarUrl ?? null,
          present,
          absent,
          excused,
          late,
          total,
          presentPct: total ? Math.round((present / total) * 100) : 100,
        };
      })
      .sort((a, b) => b.presentPct - a.presentPct || a.name.localeCompare(b.name));
  }

  /** Consistency — daily solve counts per student (SPEC §7.10.2). */
  async consistency(scope: DataScope) {
    const rows = await this.db.db
      .select({
        userId: submissions.userId,
        day: sql<string>`to_char(${submissions.createdAt}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(submissions)
      .innerJoin(users, eq(submissions.userId, users.id))
      .where(sql`${users.role} = 'student' AND (${this.scoped(scope)})`)
      .groupBy(submissions.userId, sql`to_char(${submissions.createdAt}, 'YYYY-MM-DD')`)
      .execute();

    const students = await this.students(scope);
    const byUser = new Map<string, { day: string; count: number }[]>();
    for (const row of rows) {
      const list = byUser.get(row.userId) ?? [];
      list.push({ day: row.day, count: row.count });
      byUser.set(row.userId, list);
    }

    return students
      .map((s) => {
        const days = (byUser.get(s.id) ?? []).sort((a, b) => a.day.localeCompare(b.day));
        return {
          userId: s.id,
          name: s.name,
          avatarUrl: s.avatarUrl ?? null,
          totalSolves: days.reduce((sum, d) => sum + d.count, 0),
          activeDays: days.length,
          days,
        };
      })
      .sort((a, b) => b.totalSolves - a.totalSolves || a.name.localeCompare(b.name));
  }

  /** Completion — % of assigned track problems solved, per student (SPEC §7.10.3). */
  async completion(scope: DataScope) {
    let superGroupFilter: SQLFragment;
    if (scope.isGlobal) {
      superGroupFilter = sql`true`;
    } else {
      const sgRows = await this.db.db
        .select({ superGroupId: groups.superGroupId })
        .from(groups)
        .where(inArray(groups.id, scope.groupIds))
        .execute();
      const sgIds = sgRows.map((r) => r.superGroupId).filter((id): id is string => id !== null);
      superGroupFilter = sgIds.length ? inArray(tracks.superGroupId, sgIds) : sql`false`;
    }

    const totals = await this.db.db
      .select({
        trackId: trackProblems.trackId,
        trackName: tracks.name,
        problemId: trackProblems.problemId,
      })
      .from(trackProblems)
      .innerJoin(tracks, eq(trackProblems.trackId, tracks.id))
      .where(superGroupFilter)
      .execute();

    const allAssignedProblems = new Set<string>(totals.map((t) => t.problemId));
    const totalCount = allAssignedProblems.size;

    const trackProblemsMap = new Map<string, { id: string; name: string; problemIds: Set<string> }>();
    for (const t of totals) {
      let entry = trackProblemsMap.get(t.trackId);
      if (!entry) {
        entry = { id: t.trackId, name: t.trackName, problemIds: new Set<string>() };
        trackProblemsMap.set(t.trackId, entry);
      }
      entry.problemIds.add(t.problemId);
    }

    const solved = await this.db.db
      .select({ userId: submissions.userId, problemId: submissions.problemId })
      .from(submissions)
      .innerJoin(users, eq(submissions.userId, users.id))
      .where(sql`${users.role} = 'student' AND (${this.scoped(scope)})`)
      .execute();

    const students = await this.students(scope);
    const solvedSet = new Map<string, Set<string>>();
    for (const row of solved) {
      const set = solvedSet.get(row.userId) ?? new Set<string>();
      set.add(row.problemId);
      solvedSet.set(row.userId, set);
    }

    return students
      .map((s) => {
        const studentSolved = solvedSet.get(s.id) ?? new Set<string>();
        const done = totalCount > 0
          ? Array.from(allAssignedProblems).filter((pId) => studentSolved.has(pId)).length
          : studentSolved.size;

        const byTrack: Record<string, { trackId: string; trackName: string; solved: number; total: number; pct: number }> = {};
        for (const [trackId, tr] of trackProblemsMap.entries()) {
          const trackSolved = Array.from(tr.problemIds).filter((pId) => studentSolved.has(pId)).length;
          const trackTotal = tr.problemIds.size;
          const trackPct = trackTotal ? Math.round((trackSolved / trackTotal) * 100) : 0;
          byTrack[trackId] = {
            trackId,
            trackName: tr.name,
            solved: trackSolved,
            total: trackTotal,
            pct: trackPct,
          };
        }

        return {
          userId: s.id,
          name: s.name,
          avatarUrl: s.avatarUrl ?? null,
          solved: done,
          total: totalCount,
          pct: totalCount ? Math.round((done / totalCount) * 100) : 0,
          byTrack,
        };
      })
      .sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name));
  }

  /** Exercise matrix — problems × students, cell = attempts | minutes (SPEC §7.10.4). */
  async exercise(scope: DataScope) {
    const problemRows = await this.db.db.select().from(problems).orderBy(problems.createdAt).execute();
    const students = await this.students(scope);
    const rows = await this.db.db
      .select({
        userId: submissions.userId,
        problemId: submissions.problemId,
        tries: submissions.tries,
        time: submissions.timeSpentMin,
      })
      .from(submissions)
      .innerJoin(users, eq(submissions.userId, users.id))
      .where(sql`${users.role} = 'student' AND (${this.scoped(scope)})`)
      .execute();

    const agg = new Map<string, Map<string, { attempts: number; minutes: number }>>();
    for (const row of rows) {
      const byProblem = agg.get(row.userId) ?? new Map<string, { attempts: number; minutes: number }>();
      const cell = byProblem.get(row.problemId) ?? { attempts: 0, minutes: 0 };
      cell.attempts += row.tries;
      cell.minutes += row.time;
      byProblem.set(row.problemId, cell);
      agg.set(row.userId, byProblem);
    }

    return {
      problems: problemRows.map((p) => ({
        id: p.id,
        name: p.name,
        difficulty: p.difficulty,
        platform: p.platform,
        link: p.link,
        createdAt: p.createdAt,
      })),
      students: students.map((s) => ({
        userId: s.id,
        name: s.name,
        avatarUrl: s.avatarUrl ?? null,
        cells: Object.fromEntries([...(agg.get(s.id) ?? new Map()).entries()]),
      })),
    };
  }

  /** Upsolving — contest problems × students matrix (SPEC §7.10.5). */
  async upsolving(scope: DataScope) {
    const contestsRows = await this.db.db
      .select({ id: contests.id, name: contests.name, date: contests.date })
      .from(contests)
      .orderBy(sql`${contests.date} desc`)
      .limit(20)
      .execute();
    const cpRows = await this.db.db
      .select({
        contestId: contestProblems.contestId,
        pseudo: contestProblems.pseudo,
        problemId: contestProblems.problemId,
        problemName: problems.name,
      })
      .from(contestProblems)
      .leftJoin(problems, eq(contestProblems.problemId, problems.id))
      .execute();
    const students = await this.students(scope);
    const rows = await this.db.db
      .select({
        userId: submissions.userId,
        contestProblemId: submissions.contestProblemId,
        tries: submissions.tries,
        time: submissions.timeSpentMin,
        createdAt: submissions.createdAt,
      })
      .from(submissions)
      .innerJoin(users, eq(submissions.userId, users.id))
      .where(sql`${users.role} = 'student' AND (${this.scoped(scope)}) AND ${submissions.contestProblemId} IS NOT NULL`)
      .execute();

    const agg = new Map<string, Map<string, { attempts: number; minutes: number; isUpsolve?: boolean }>>();
    for (const row of rows) {
      const cp = row.contestProblemId!;
      const byCp = agg.get(row.userId) ?? new Map<string, { attempts: number; minutes: number; isUpsolve?: boolean }>();
      const cell = byCp.get(cp) ?? { attempts: 0, minutes: 0 };
      cell.attempts += row.tries;
      cell.minutes += row.time;
      byCp.set(cp, cell);
      agg.set(row.userId, byCp);
    }

    return {
      contests: contestsRows.map((c) => ({
        id: c.id,
        name: c.name,
        date: c.date,
        problems: cpRows
          .filter((cp) => cp.contestId === c.id)
          .map((cp) => ({ pseudo: cp.pseudo, problemId: cp.problemId, name: cp.problemName ?? cp.pseudo })),
      })),
      students: students.map((s) => ({
        userId: s.id,
        name: s.name,
        avatarUrl: s.avatarUrl ?? null,
        cells: Object.fromEntries([...(agg.get(s.id) ?? new Map()).entries()]),
      })),
    };
  }

  /** Divisions — bucket students by rating thresholds (SPEC §7.10.6). */
  async divisions(scope: DataScope) {
    const divs = await this.db.db.select().from(divisions).orderBy(divisions.sortOrder).execute();
    const students = await this.students(scope);
    return {
      divisions: divs.map((d) => ({
        name: d.name,
        minRating: d.minRating,
        maxRating: d.maxRating,
        students: students
          .filter((s) => s.rating >= d.minRating && s.rating < d.maxRating)
          .map((s) => ({ userId: s.id, name: s.name, rating: s.rating, avatarUrl: s.avatarUrl ?? null })),
      })),
      unassigned: students
        .filter((s) => !divs.some((d) => s.rating >= d.minRating && s.rating < d.maxRating))
        .map((s) => ({ userId: s.id, name: s.name, rating: s.rating, avatarUrl: s.avatarUrl ?? null })),
    };
  }
}

