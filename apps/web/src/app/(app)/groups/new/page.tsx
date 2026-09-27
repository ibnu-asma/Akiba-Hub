import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type SuperGroup, type UserSummaryDto } from '@/lib/api';
import { GroupEditor } from '@/components/admin/group-editor';
import type { SelectUserOption } from '@/components/form/select-user';

/** HoA: group creation page (SPEC §8.6, §11). */
export default async function NewGroupPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 3) redirect('/dashboard');

  const [superGroups, users] = await Promise.all([
    safe(hubFetch<SuperGroup[]>('/super-groups')),
    safe(hubFetch<UserSummaryDto[]>('/users')),
  ]);


  const studentOptions: SelectUserOption[] = (users ?? [])
    .filter((u) => u.role === 'student' && !u.isRemoved)
    .sort((a, b) => (a.groupId ? 1 : 0) - (b.groupId ? 1 : 0))
    .map((u) => ({
      id: u.id,
      name: u.name,
      role: 'Student',
      group: u.groupId ? 'Assigned elsewhere' : 'Unassigned',
    }));

  const headOptions: SelectUserOption[] = (users ?? [])
    .filter((u) => (u.role === 'head_of_education' || u.role === 'head_of_academy') && !u.isRemoved)
    .map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role === 'head_of_academy' ? 'Head of Academy' : 'Head of Education',
    }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add Group</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a new group and assign heads to manage it.
        </p>
      </header>
      <GroupEditor 
        superGroups={superGroups ?? []} 
        headOptions={headOptions} 
        studentOptions={studentOptions}
      />
    </div>
  );
}
