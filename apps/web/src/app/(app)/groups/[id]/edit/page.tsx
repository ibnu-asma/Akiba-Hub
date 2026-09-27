import { notFound, redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type Group, type SuperGroup, type UserSummaryDto } from '@/lib/api';
import { GroupEditor } from '@/components/admin/group-editor';
import type { SelectUserOption } from '@/components/form/select-user';

/** HoA: group editing page (SPEC §8.6, §11). */
export default async function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 3) redirect('/dashboard');

  const [group, superGroups, users] = await Promise.all([
    safe(hubFetch<Group>(`/groups/${id}`)),
    safe(hubFetch<SuperGroup[]>('/super-groups')),
    safe(hubFetch<UserSummaryDto[]>('/users')),
  ]);

  if (!group) notFound();

  // Create student options including their current group mapping
  const groupName = new Map([[group.id, group.name]]);
  
  const studentOptions: SelectUserOption[] = (users ?? [])
    .filter((u) => u.role === 'student' && !u.isRemoved)
    .sort((a, b) => (a.groupId ? 1 : 0) - (b.groupId ? 1 : 0))
    .map((u) => ({
      id: u.id,
      name: u.name,
      role: 'Student',
      group: u.groupId ? (groupName.get(u.groupId) ?? 'Assigned elsewhere') : 'Unassigned',
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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Update group details, and assign students and heads.
        </p>
      </header>
      <GroupEditor 
        initialGroup={group}
        superGroups={superGroups ?? []} 
        headOptions={headOptions} 
        studentOptions={studentOptions}
      />
    </div>
  );
}
