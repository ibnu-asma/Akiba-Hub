import { redirect } from 'next/navigation';
import { getMe, hubFetch, safe, type Group, type SuperGroup, type UserSummaryDto } from '@/lib/api';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { GroupsCatalog } from '@/components/groups/groups-catalog';

/** Groups & Users Catalog — browse all groups across super groups with progress tracking. */
export default async function GroupsPage() {
  const me = await getMe();
  if (!me) redirect('/login');

  const [groups, superGroups, users] = await Promise.all([
    safe(hubFetch<Group[]>('/groups')),
    safe(hubFetch<SuperGroup[]>('/super-groups')),
    (ROLE_LEVEL[me.role as Role] ?? 1) >= 2 ? safe(hubFetch<UserSummaryDto[]>('/users')) : Promise.resolve([]),
  ]);

  return <GroupsCatalog groups={groups ?? []} superGroups={superGroups ?? []} users={users ?? []} me={me} />;
}