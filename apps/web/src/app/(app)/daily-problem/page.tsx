import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type ProblemDto, type SuperGroup } from '@/lib/api';
import { AddDailyProblemForm } from '@/components/head/add-daily-problem-form';

/** HoE/HoA: assign the 24-hour daily problem challenge (SPEC §7.7). */
export default async function DailyProblemPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 2) redirect('/dashboard');

  const superGroups = ((await safe(hubFetch<SuperGroup[]>('/super-groups'))) ?? []);
  const problems = ((await safe(hubFetch<ProblemDto[]>('/problems'))) ?? []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Daily Problem</h1>
        <p className="mt-1 text-sm text-slate-500">
          Assign today&apos;s 24-hour challenge for a cohort — it refreshes every 24 hours and needs to be solved today!
        </p>
      </header>
      <AddDailyProblemForm superGroups={superGroups} problems={problems} />
    </div>
  );
}