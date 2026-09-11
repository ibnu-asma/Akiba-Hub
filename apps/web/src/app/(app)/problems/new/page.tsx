import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe } from '@/lib/api';
import { AddProblemForm } from '@/components/head/add-problem-form';

/** HoE/HoA: add DSA problems for the students to solve (SPEC §7.5). */
export default async function AddProblemPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 2) redirect('/dashboard');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add Problem</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add DSA questions for the students to solve and work on their problem-solving skills. Problems link out to their source
          platform (LeetCode, Codeforces, HackerRank) and join the group's Latest Problems feed.
        </p>
      </header>
      <AddProblemForm />
    </div>
  );
}