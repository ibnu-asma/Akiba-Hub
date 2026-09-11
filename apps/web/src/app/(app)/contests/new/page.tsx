import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type Group, type ProblemDto } from '@/lib/api';
import { AddContestForm } from '@/components/head/add-contest-form';

/** HoE/HoA: schedule an A2SV contest and attach questions (SPEC §7.6). */
export default async function AddContestPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 2) redirect('/dashboard');

  const groups = ((await safe(hubFetch<Group[]>('/groups'))) ?? []);
  const problems = ((await safe(hubFetch<ProblemDto[]>('/problems'))) ?? []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add Contest</h1>
        <p className="mt-1 text-sm text-slate-500">
          Schedule an A2SV contest for your groups — in-person or virtual — then attach the contest questions. Students
          upsolve them after the standing is published.
        </p>
      </header>
      <AddContestForm groups={groups} problems={problems} />
    </div>
  );
}