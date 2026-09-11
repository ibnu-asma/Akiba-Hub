import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type SuperGroup, type UserDto } from '@/lib/api';
import { AddGroupForm } from '@/components/admin/add-group-form';

/** HoA: create a group — supergroup, description, country, HoE heads (SPEC §8.5). */
export default async function AddGroupPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 3) redirect('/dashboard');

  const [superGroups, users] = await Promise.all([
    safe(hubFetch<SuperGroup[]>('/super-groups')),
    safe(hubFetch<UserDto[]>('/users')),
  ]);

  const heads =
    users
      ?.filter((u) => u.role === 'head_of_education' || u.role === 'head_of_academy')
      .map((u) => ({ id: u.id, name: u.name, role: u.role })) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add Group</h1>
        <p className="mt-1 text-sm text-slate-500">Groups are the education unit heads manage; assign them to a supergroup.</p>
      </header>
      <AddGroupForm superGroups={superGroups ?? []} heads={heads} />
    </div>
  );
}