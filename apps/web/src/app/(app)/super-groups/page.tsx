import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type SuperGroup } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { CreateSuperGroupForm } from '@/components/admin/create-super-group-form';

/** HoA: super groups — the academy's top-level cohort grouping (SPEC §8.3). */
export default async function SuperGroupsPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 3) redirect('/dashboard');

  const superGroups = (await safe(hubFetch<SuperGroup[]>('/super-groups'))) ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Super Groups</h1>
        <p className="mt-1 text-sm text-slate-500">Cohort-level groupings of education groups (e.g. a national batch).</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <CreateSuperGroupForm />
        </div>

        <div className="lg:col-span-3">
          {superGroups.length === 0 ? (
            <section className="card p-10 text-center">
              <p className="text-3xl">🗂️</p>
              <p className="mt-2 text-sm text-slate-500">No super groups yet — create the first one.</p>
            </section>
          ) : (
            <ul className="space-y-3">
              {superGroups.map((sg) => (
                <li key={sg.id} className="card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-slate-900">{sg.name}</p>
                      <p className="text-xs text-slate-400">Created {formatDate(sg.createdAt)}</p>
                    </div>
                    <span className="chip bg-a2sv-50 text-a2sv-700">
                      {sg.groups.length} group{sg.groups.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  {sg.groups.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {sg.groups.map((g) => (
                        <span key={g.id} className="chip bg-slate-100 text-slate-600">
                          {g.name}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}