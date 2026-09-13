import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getMe, hubFetch, safe, type ProblemDto } from '@/lib/api';
import { AddSubmissionForm } from '@/components/add-submission-form';

/** Add Submission — solve + submit against a specific problem (SPEC §6.4). */
export default async function AddSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getMe();
  if (!me) redirect('/login');
  const { id } = await params;

  const problems = (await safe(hubFetch<ProblemDto[]>('/problems?limit=200'))) ?? [];
  const problem = problems.find((p) => p.id === id);
  if (!problem) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <nav className="text-sm text-slate-400">
        <Link href="/problems" className="hover:text-a2sv-600">
          Problems
        </Link>
        <span className="mx-1.5">•</span>
        <span className="text-slate-600">{problem.name}</span>
      </nav>

      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add Submission</h1>
        <p className="mt-1 text-sm text-slate-500">
          {problem.name} — log your time, tries, and code.
        </p>
      </header>

      <AddSubmissionForm problemId={problem.id} />
    </div>
  );
}
