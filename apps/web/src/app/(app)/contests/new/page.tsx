import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type ContestDto, type Group, type ProblemDto } from '@/lib/api';
import { ContestsManager } from '@/components/head/contests-manager';

interface ListResponse {
  rows: ContestDto[];
  total: number;
}

/** HoE/HoA: contest management (schedule, edit, questions, delete) (SPEC §7.7). */
export default async function ContestsPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 2) redirect('/dashboard');

  const [groups, problems, initial] = await Promise.all([
    safe(hubFetch<Group[]>('/groups')),
    safe(hubFetch<ProblemDto[]>('/problems?limit=200')),
    safe(hubFetch<ListResponse>('/contests?limit=10&offset=0')),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Contests</h1>
        <p className="mt-1 text-sm text-slate-500">
          Schedule standard and super contests, assign groups, and manage the contest questions (A, B, C…).
        </p>
      </header>
      <ContestsManager
        initial={initial ?? { rows: [], total: 0 }}
        groups={groups ?? []}
        problems={problems ?? []}
      />
    </div>
  );
}
