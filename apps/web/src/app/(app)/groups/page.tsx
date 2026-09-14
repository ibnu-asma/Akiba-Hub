import { redirect } from 'next/navigation';
import { getMe, hubFetch, safe, type Group, type SuperGroup } from '@/lib/api';
import { GroupsCatalog } from '@/components/groups/groups-catalog';

/** Groups & Users Catalog — browse all groups across super groups with progress tracking. */
export default async function GroupsPage() {
  const me = await getMe();
  if (!me) redirect('/login');

  const [groups, superGroups] = await Promise.all([
    safe(hubFetch<Group[]>('/groups')),
    safe(hubFetch<SuperGroup[]>('/super-groups')),
  ]);

  return <GroupsCatalog groups={groups ?? []} superGroups={superGroups ?? []} me={me} />;
}