'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface LoginResponse {
  user?: { name: string };
  error?: { code: string; message: string };
}

const DEMO_ACCOUNTS = [
  { label: 'Head of Academy', email: 'admin@a2sv.org' },
  { label: 'Head of Education', email: 'head@a2sv.org' },
  { label: 'Student', email: 'student@a2sv.org' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const payload = (await res.json().catch(() => null)) as LoginResponse | null;
      if (!res.ok) {
        setError(payload?.error?.message ?? 'Unable to sign in — please try again.');
        return;
      }
      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="inline-grid h-14 w-14 place-items-center rounded-2xl bg-a2sv-500 text-xl font-bold text-white">
            H
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Sign in to A2SV Hub</h1>
          <p className="mt-1 text-sm text-slate-500">Access is invite-only (SPEC §12.1).</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          <div>
            <label htmlFor="email" className="field-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="field-input"
              placeholder="you@a2sv.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="field-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="field-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="card mt-4 p-4 text-xs text-slate-500">
          <p className="mb-1 font-semibold text-slate-700">Seeded demo accounts (password: a2sv-demo)</p>
          <ul className="space-y-0.5">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  className="text-left underline decoration-dotted hover:text-a2sv-600"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword('a2sv-demo');
                  }}
                >
                  {account.label} — {account.email}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
