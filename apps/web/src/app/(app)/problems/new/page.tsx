import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe } from '@/lib/api';
import { ProblemEditor } from '@/components/head/problem-editor';

/** HoE/HoA: problem creation (SPEC §7.5). */
export default async function NewProblemPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 2) redirect('/dashboard');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add Problem</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add a new DSA problem to the shared library for students to solve.
        </p>
      </header>
      <ProblemEditor />
    </div>
  );
}
