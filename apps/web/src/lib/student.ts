import { hubFetch, safe, type SubmissionDto } from '@/lib/api';

export interface Solver {
  userId: string;
  name: string;
  avatarUrl: string | null;
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

/** Distinct problem ids the current user has submitted (their solved set). */
export async function mySolvedSet(): Promise<Set<string>> {
  const subs = await safe(hubFetch<SubmissionDto[]>('/submissions?limit=200'));
  if (!subs) return new Set();
  return new Set(subs.map((s) => s.problemId));
}

/** Time/attempts roll-up of the current user's submissions. */
export async function mySubmissionStats(): Promise<{ count: number; minutes: number; runs: number; byProblem: Record<string, number> }> {
  const subs = (await safe(hubFetch<SubmissionDto[]>('/submissions?limit=200'))) ?? [];
  let minutes = 0;
  let runs = 0;
  const byProblem: Record<string, number> = {};
  for (const s of subs) {
    minutes += s.timeSpentMin;
    runs += s.tries;
    byProblem[s.problemId] = s.tries;
  }
  return { count: subs.length, minutes, runs, byProblem };
}