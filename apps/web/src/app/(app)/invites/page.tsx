import { redirect } from 'next/navigation';
import { ROLE_LEVEL, type Role } from '@hub/shared';
import { getMe } from '@/lib/api';
import { GenerateInviteForm } from '@/components/admin/generate-invite-form';
import { InvitationsBoard } from '@/components/admin/invitations-board';

/** HoA: generate invites (CSV paste → org email + emailed invite) + tracker (SPEC §8.5). */
export default async function InvitesPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if ((ROLE_LEVEL[me.role as Role] ?? 1) < 3) redirect('/dashboard');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Generate Invite</h1>
        <p className="mt-1 text-sm text-slate-500">
          Paste names and emails — each person gets an Akiba org email and an invite emailed to their personal address.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <GenerateInviteForm />
        </div>
        <div className="lg:col-span-3">
          <InvitationsBoard />
        </div>
      </div>
    </div>
  );
}
