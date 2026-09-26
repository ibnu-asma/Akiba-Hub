import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type ProblemDto } from '@/lib/api';
import { ProblemEditor } from '@/components/head/problem-editor';

/** HoE/HoA: problem editing (SPEC §7.5). */
export default async function EditProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 2) redirect('/dashboard');

  const problem = await safe(hubFetch<ProblemDto>(`/problems/${id}`));
  if (!problem) redirect('/problems');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit Problem</h1>
        <p className="mt-1 text-sm text-slate-500">
          Update problem details, difficulty, or tags.
        </p>
      </header>
      <ProblemEditor problem={problem} />
    </div>
  );
}
