import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type Group } from '@/lib/api';
import { UsersManager } from '@/components/admin/users-manager';

/** HoA: Users — promote/demote/transfer, soft-delete, and removed-users (SPEC §8.7). */
export default async function UsersPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 3) redirect('/dashboard');

  const groups = (await safe(hubFetch<Group[]>('/groups'))) ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Users</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage roles, reset passwords, transfer, and remove people across the academy.
        </p>
      </header>
      <UsersManager groups={groups} />
    </div>
  );
}
