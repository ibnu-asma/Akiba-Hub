import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe } from '@/lib/api';
import { ProblemsManager } from '@/components/head/problems-manager';

/** HoE/HoA: problem management — list, filter, add, edit, delete (SPEC §7.5). */
export default async function ProblemsPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 2) redirect('/dashboard');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Problems</h1>
        <p className="mt-1 text-sm text-slate-500">
          Curate the DSA library — add, edit, and remove problems, filtered by difficulty and topic.
        </p>
      </header>
      <ProblemsManager />
    </div>
  );
}
