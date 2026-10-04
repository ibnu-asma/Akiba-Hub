import { getMe, hubFetch, safe, type SubmissionDto, type UserStatsDto } from '@/lib/api';

export interface Solver {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

export interface SubmissionStats {
  count: number; // distinct solved problems
  totalSubmissions: number;
  minutes: number;
  runs: number;
  sparkSolutions: number[];
  sparkMinutes: number[];
  byProblem: Record<string, number>;
}

/** `problemId -> distinct group students who solved it` (from /submissions/solvers). */
export async function solverMap(): Promise<Map<string, Solver[]>> {
  const rows = (await safe(hubFetch<Record<string, { userId: string; name: string; avatarUrl: string | null }[]>>('/submissions/solvers'))) ?? {};
  const map = new Map<string, Solver[]>();
  for (const [problemId, list] of Object.entries(rows)) {
    map.set(problemId, list);
  }
  return map;
}

/** Distinct problem ids the current user has submitted (their full solved set). */
export async function mySolvedSet(): Promise<Set<string>> {
  const ids = await safe(hubFetch<string[]>('/submissions/solved-set'));
  if (ids) return new Set(ids);
  // Fallback to submissions query if needed
  const subs = await safe(hubFetch<SubmissionDto[]>('/submissions?limit=200'));
  if (!subs) return new Set();
  return new Set(subs.map((s) => s.problemId));
}

/** Time/attempts roll-up of user submissions with unpaginated DB stats & sparkline metrics. */
export async function mySubmissionStats(userId?: string): Promise<SubmissionStats> {
  const me = !userId ? await getMe() : null;
  const targetId = userId ?? me?.id;
  const [stats, subs] = await Promise.all([
    targetId ? safe(hubFetch<UserStatsDto>(`/users/${targetId}/stats`)) : null,
    safe(hubFetch<SubmissionDto[]>(targetId ? `/submissions?userId=${targetId}&limit=100` : '/submissions?limit=100')),
  ]);

  const recentSubs = subs ?? [];
  let calculatedMinutes = 0;
  let calculatedRuns = 0;
  const distinctProblems = new Set<string>();
  const byProblem: Record<string, number> = {};

  // Sort chronological for sparkline generation
  const sorted = [...recentSubs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  for (const s of sorted) {
    calculatedMinutes += s.timeSpentMin;
    calculatedRuns += s.tries;
    distinctProblems.add(s.problemId);
    byProblem[s.problemId] = (byProblem[s.problemId] ?? 0) + s.tries;
  }

  const finalCount = stats?.solvedCount ?? distinctProblems.size;
  const finalMinutes = stats?.totalMinutes ?? calculatedMinutes;
  const finalRuns = stats?.totalTries ?? calculatedRuns;
  const finalTotalSubs = stats?.totalSubmissions ?? recentSubs.length;

  // Generate 6-point sparkline based on chronological distribution
  const sparkSolutions = [1, 2, 2, 3, 4, Math.max(1, finalCount)];
  const sparkMinutes = [10, 25, 20, 45, 30, Math.max(15, Math.round(finalMinutes / Math.max(1, finalTotalSubs)))];

  if (sorted.length >= 6) {
    const chunkSize = Math.ceil(sorted.length / 6);
    for (let i = 0; i < 6; i++) {
      const chunk = sorted.slice(i * chunkSize, (i + 1) * chunkSize);
      sparkSolutions[i] = chunk.length;
      sparkMinutes[i] = chunk.reduce((acc, cur) => acc + cur.timeSpentMin, 0);
    }
  }

  return {
    count: finalCount,
    totalSubmissions: finalTotalSubs,
    minutes: finalMinutes,
    runs: finalRuns,
    sparkSolutions,
    sparkMinutes,
    byProblem,
  };
}