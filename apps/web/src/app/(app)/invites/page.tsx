import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe, hubFetch, safe } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { GenerateInviteForm } from '@/components/admin/generate-invite-form';

export interface Invitation {
  id: string;
  email: string | null;
  role: string;
  mass: boolean;
  expiresAt: string;
  usedAt: string | null;
}

/** HoA: bulk invite generation + issued-invitation tracker (SPEC §8.5). */
export default async function InvitesPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 3) redirect('/dashboard');

  const invitations = (await safe(hubFetch<Invitation[]>('/invitations'))) ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Generate Invite</h1>
        <p className="mt-1 text-sm text-slate-500">Bulk-create invite links. Invitees complete registration on the public register page.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <GenerateInviteForm />
        </div>

        <div className="lg:col-span-3">
          <section className="card">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-900">Issued invitations</h2>
              <span className="chip bg-a2sv-50 text-a2sv-700">{invitations.length} total</span>
            </div>
            {invitations.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-400">No invitations issued yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {invitations.map((inv) => (
                  <li key={inv.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-a2sv-50 text-a2sv-600">
                      <span className="text-sm font-bold">✉</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{inv.email ?? 'take-over invite'}</p>
                      <p className="text-xs text-slate-400">
                        {inv.mass ? 'mass' : 'take-over'} · {inv.role} · expires {formatDateTime(inv.expiresAt)}
                      </p>
                    </div>
                    {inv.usedAt ? (
                      <span className="chip bg-a2sv-100 text-a2sv-700">Used</span>
                    ) : (
                      <span className="chip bg-amber-50 text-amber-700">Pending</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}