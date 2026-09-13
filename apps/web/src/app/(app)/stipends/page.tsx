import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe, type FundWithRollupDto, type UserDto } from '@/lib/api';
import { FundsManager } from '@/components/head/funds-manager';
import type { SelectUserOption } from '@/components/form/select-user';

/** HoE/HoA: Stipend & Funds manager (SPEC §7.8) — in-person heads manage payouts. */
export default async function StipendsPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 2) redirect('/dashboard');

  const [funds, users] = await Promise.all([
    safe(hubFetch<FundWithRollupDto[]>('/funds')),
    safe(hubFetch<UserDto[]>('/users')),
  ]);

  const students: SelectUserOption[] = (users ?? [])
    .filter((user) => user.role === 'student')
    .map((user) => ({ id: user.id, name: user.name, role: 'Student', group: null }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Stipend &amp; Funds</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create funds, assign monthly stipends, and mark payouts — managed by in-person heads of education.
        </p>
      </header>
      <FundsManager initialFunds={funds ?? []} students={students} />
    </div>
  );
}