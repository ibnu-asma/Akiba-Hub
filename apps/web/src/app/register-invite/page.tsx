import Link from 'next/link';
import { RegisterInviteForm } from '@/components/auth/register-invite-form';
import { Icon } from '@/components/icon';

/** Public invite-acceptance flow (SPEC §5) — no auth; the token IS the credential. */
export default async function RegisterInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col">
      {/* Clean Modern Top Navbar */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/login" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/akiba.jpg"
              alt="Akiba Logo"
              className="h-8 w-auto object-contain"
            />
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span>&larr; Return to Sign In</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-10 px-4 sm:px-6 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          {!token ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-8 sm:p-10 text-center shadow-xs">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80">
                <Icon name="mail" className="h-7 w-7" />
              </div>
              <h1 className="mt-4 text-xl font-bold text-slate-900 sm:text-2xl">
                Invitation Token Required
              </h1>
              <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                This page is accessible through an invitation link sent to your email. Please check your inbox and click the full registration link.
              </p>
              <div className="mt-6">
                <Link
                  href="/login"
                  className="btn-primary inline-flex items-center gap-2 text-xs py-2.5 px-5"
                >
                  <span>Go to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <RegisterInviteForm token={token} initialEmail={email ?? null} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 bg-white py-4 text-center text-xs text-slate-400">
        Protected by Akiba Identity System • Enrollment is invite-only
      </footer>
    </div>
  );
}
