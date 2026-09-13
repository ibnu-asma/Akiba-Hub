import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type Group, type SuperGroup } from '@/lib/api';
import { SuperGroupsManager } from '@/components/admin/super-groups-manager';

/** HoA: super groups — the academy's top-level cohort grouping (SPEC §8.4). */
export default async function SuperGroupsPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 3) redirect('/dashboard');

  const [superGroups, groups] = await Promise.all([
    safe(hubFetch<SuperGroup[]>('/super-groups')),
    safe(hubFetch<Group[]>('/groups')),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Super Groups</h1>
        <p className="mt-1 text-sm text-slate-500">Cohort-level groupings of education groups (e.g. a national batch).</p>
      </header>
      <SuperGroupsManager initialSuperGroups={superGroups ?? []} groups={groups ?? []} />
    </div>
  );
}
