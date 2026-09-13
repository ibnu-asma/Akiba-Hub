import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type Group } from '@/lib/api';
import { GroupsBoard } from '@/components/student/groups-board';

/** Student Groups & Users — own group roster (SPEC §6.10). */
export default async function StudentGroupsPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) >= 2) redirect('/groups/new');

  const groups = (await safe(hubFetch<Group[]>('/groups'))) ?? [];
  return <GroupsBoard groups={groups} me={me} />;
}