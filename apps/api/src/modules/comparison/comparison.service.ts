import { Inject,  Injectable } from '@nestjs/common';
import { DatabaseProvider } from '../../config/database.provider.js';
import {
  attendanceRecords,
  contestGroups,
  contestProblems,
  eq,
  groups,
  inArray,
  sql,
  submissions,
  trackProblems,
  tracks,
  users,
} from '@hub/database';
import { DataScope } from '../../common/auth/scope.service.js';

type Metrics = Record<string, number>;
type SQLFragment = ReturnType<typeof sql>;

/**
 * Group Comparison engine (SPEC §7.11, §8.10) — read-only per-group metrics
 * over attendance, submissions, tracks, and contests, ranked for a trophy
 * leaderboard. HoE is clamped to their own groups (§12.4).
 */
@Injectable()
export class ComparisonService {
  constructor(@Inject(DatabaseProvider) private readonly db: DatabaseProvider) {}

  private studentCount(groupId: string) {
    return this.db.db
      .select({ id: users.id })
      .from(users)
      .where(sql`${users.role} = 'student' AND ${users.groupId} = ${groupId}`)
      .execute();
  }

  private async attendanceMetrics(groupId: string, since: SQLFragment): Promise<Metrics> {
    const rows = await this.db.db
      .select({ status: attendanceRecords.status })
      .from(attendanceRecords)
      .innerJoin(users, eq(attendanceRecords.userId, users.id))
      .where(sql`${users.groupId} = ${groupId} AND (${since})`)
      .execute();
    const c: Record<string, number> = { present: 0, absent: 0, excused: 0, late: 0 };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    const total = c['present'] + c['absent'] + c['excused'] + c['late'];
    return {
      present: c['present'],
      absent: c['absent'],
      excused: c['excused'],
      late: c['late'],
      attTotal: total,
      presentPct: total ? Math.round((c['present'] / total) * 100) : 0,
    };
  }

  private async submissionMetrics(groupId: string, since: SQLFragment): Promise<Metrics> {
    const rows = await this.db.db
      .select({
        time: submissions.timeSpentMin,
        day: sql<string>`to_char(${submissions.createdAt}, 'YYYY-MM-DD')`,
      })
      .from(submissions)
      .innerJoin(users, eq(submissions.userId, users.id))
      .where(sql`${users.groupId} = ${groupId} AND (${since})`)
      .execute();
    return {
      submissions: rows.length,
      timeSpentMin: rows.reduce((sum, r) => sum + r.time, 0),
      activeDays: new Set(rows.map((r) => r.day)).size,
    };
  }

  private async trackMetrics(groupId: string): Promise<Metrics> {
    const g = await this.db.db
      .select({ superGroupId: groups.superGroupId })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1)
      .execute();
    const sgId = g[0]?.superGroupId;
    const totalRows = sgId
      ? await this.db.db
          .select({ problemId: trackProblems.problemId })
          .from(trackProblems)
          .innerJoin(tracks, eq(trackProblems.trackId, tracks.id))
          .where(eq(tracks.superGroupId, sgId))
          .execute()
      : [];
    const total = new Set(totalRows.map((r) => r.problemId)).size;

    const solved = await this.db.db
      .select({ userId: submissions.userId, problemId: submissions.problemId })
      .from(submissions)
      .innerJoin(users, eq(submissions.userId, users.id))
      .where(sql`${users.groupId} = ${groupId}`)
      .execute();
    const byUser = new Map<string, Set<string>>();
    for (const r of solved) {
      const set = byUser.get(r.userId) ?? new Set<string>();
      set.add(r.problemId);
      byUser.set(r.userId, set);
    }

    const students = await this.studentCount(groupId);
    const pcts = students.map((s) => {
      const done = byUser.get(s.id)?.size ?? 0;
      return total ? (done / total) * 100 : 0;
    });
    return {
      trackTotal: total,
      avgCompletion: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0,
      minCompletion: pcts.length ? Math.round(Math.min(...pcts)) : 0,
      maxCompletion: pcts.length ? Math.round(Math.max(...pcts)) : 0,
      completedAll: pcts.filter((p) => p >= 100).length,
    };
  }

  private async contestMetrics(groupId: string): Promise<Metrics> {
    const contestRows = await this.db.db
      .select({ contestId: contestGroups.contestId })
      .from(contestGroups)
      .where(eq(contestGroups.groupId, groupId))
      .execute();
    const ids = contestRows.map((r) => r.contestId);
    const totalRows = ids.length
      ? await this.db.db.select({ id: contestProblems.id }).from(contestProblems).where(inArray(contestProblems.contestId, ids)).execute()
      : [];

    const solvedRows = await this.db.db
      .select({ contestProblemId: submissions.contestProblemId })
      .from(submissions)
      .innerJoin(users, eq(submissions.userId, users.id))
      .where(sql`${users.groupId} = ${groupId} AND ${submissions.contestProblemId} IS NOT NULL`)
      .execute();
    const solvedSet = new Set(solvedRows.map((r) => r.contestProblemId!));
    const solved = totalRows.filter((t) => solvedSet.has(t.id)).length;
    return {
      contestTotal: totalRows.length,
      contestSolved: solved,
      conversionPct: totalRows.length ? Math.round((solved / totalRows.length) * 100) : 0,
    };
  }

  /** Compare a set of groups across a mode + range; returns a ranked leaderboard. */
  async compare(groupIds: string[], mode: string, range: string, scope: DataScope) {
    const allowed = scope.isGlobal ? groupIds : groupIds.filter((g) => scope.groupIds.includes(g));
    const cutoff = sql`now() - interval '7 days'`;
    const sinceSub = range === 'week' ? sql`${submissions.createdAt} >= ${cutoff}` : sql`true`;
    const sinceAtt = range === 'week' ? sql`${attendanceRecords.createdAt} >= ${cutoff}` : sql`true`;

    const out: { groupId: string; name: string; metrics: Metrics }[] = [];
    for (const gid of allowed) {
      const g = await this.db.db.select({ id: groups.id, name: groups.name }).from(groups).where(eq(groups.id, gid)).limit(1).execute();
      if (!g[0]) continue;
      const [att, sub, track, contest, students] = await Promise.all([
        this.attendanceMetrics(gid, sinceAtt),
        this.submissionMetrics(gid, sinceSub),
        this.trackMetrics(gid),
        this.contestMetrics(gid),
        this.studentCount(gid),
      ]);
      out.push({
        groupId: gid,
        name: g[0].name,
        metrics: { ...att, ...sub, ...track, ...contest, studentCount: students.length },
      });
    }

    const primary: Record<string, (m: Metrics) => number> = {
      summary: (m) => m.submissions,
      attendance: (m) => m.presentPct,
      consistency: (m) => m.activeDays,
      completion: (m) => m.avgCompletion,
      contest: (m) => m.conversionPct,
    };
    const key = primary[mode] ?? primary.summary!;
    const ranked = [...out].sort((a, b) => key(b.metrics) - key(a.metrics)).map((g, i) => ({ ...g, rank: i + 1 }));

    return { mode, range, groups: ranked };
  }
}

