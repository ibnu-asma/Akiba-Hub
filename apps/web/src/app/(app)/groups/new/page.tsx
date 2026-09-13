import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type Group, type SuperGroup, type UserSummaryDto } from '@/lib/api';
import { GroupsManager } from '@/components/admin/groups-manager';

/** HoA: group management — list, filter, create, assign students/heads, delete (SPEC §8.6, §11). */
export default async function GroupsPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 3) redirect('/dashboard');

  const [groups, superGroups, users] = await Promise.all([
    safe(hubFetch<Group[]>('/groups')),
    safe(hubFetch<SuperGroup[]>('/super-groups')),
    safe(hubFetch<UserSummaryDto[]>('/users')),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Groups</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create groups, assign students and heads, and organize them under super groups.
        </p>
      </header>
      <GroupsManager initialGroups={groups ?? []} superGroups={superGroups ?? []} users={users ?? []} />
    </div>
  );
}
