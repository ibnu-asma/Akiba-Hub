import { RegisterInviteForm } from '@/components/auth/register-invite-form';

/** Public invite-acceptance flow (SPEC §5) — no auth; the token IS the credential. */
export default async function RegisterInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;

  return (
    <main className="min-h-screen bg-white">
      {/* Green header band with the giant HUB wordmark */}
      <header className="bg-gradient-to-br from-banner-from to-banner-to">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-10">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-a2sv-500 text-white shadow-[0_12px_22px_-10px_rgba(15,169,88,0.6)]">
              <span className="text-lg font-bold">H</span>
            </span>
            <div>
              <p className="text-xl font-bold tracking-tight text-slate-900">HUB</p>
              <p className="text-xs font-medium text-slate-600">Register Invite</p>
            </div>
          </div>
          <span aria-hidden="true" className="hidden text-3xl sm:block">
            🚀
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {!token ? (
          <div className="card p-8 text-center">
            <p className="text-3xl">🔗</p>
            <h1 className="mt-3 text-xl font-bold text-slate-900">Invite link is missing</h1>
            <p className="mt-2 text-sm text-slate-500">
              This page is reached from an invite email. Please open the full link you received (it contains a token).
            </p>
          </div>
        ) : (
          <RegisterInviteForm token={token} initialEmail={email ?? null} />
        )}
      </div>
    </main>
  );
}
