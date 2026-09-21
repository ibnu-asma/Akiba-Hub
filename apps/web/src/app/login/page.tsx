'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/icon';

interface LoginResponse {
  user?: { name: string };
  error?: { code: string; message: string };
}

const DEMO_ACCOUNTS = [
  {
    role: 'Student',
    label: 'Geleta Daba',
    email: 'student@akibatech.com',
    badge: 'Student',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  // {
  //   role: 'Head of Education',
  //   label: 'Education Lead',
  //   email: 'head@akibatech.com',
  //   badge: 'Education',
  //   badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
  // },
  // {
  //   role: 'Head of Academy',
  //   label: 'Academy Admin',
  //   email: 'admin@akibatech.com',
  //   badge: 'Admin',
  //   badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
  // },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword('a2sv-demo');
    setError(null);
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Column: Visual Showcase with white background and login.svg */}
      <div className="relative hidden w-1/2 flex-col justify-between border-r border-slate-200/80 bg-white p-12 lg:flex">
        {/* Top: Akiba Logo only (no HUB text) */}
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/akiba.jpg"
            alt="Akiba Logo"
            className="h-9 w-auto object-contain"
          />
        </div>

        {/* Center: Vector Illustration on pure white background */}
        <div className="my-auto flex flex-col items-center text-center">
          <div className="relative w-full max-w-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/login.svg"
              alt="Akiba Learning Platform"
              className="max-h-[380px] w-full object-contain drop-shadow-sm transition-transform hover:scale-102 duration-300"
            />
          </div>
          <h2 className="mt-8 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl leading-snug">
            Empowering Africa&apos;s Next Generation of Tech Leaders
          </h2>
        </div>

      </div>

      {/* Right Column: Sign In Form with top labels so placeholders are clearly visible */}
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          {/* Logo on top (no HUB text) */}
          <div className="mb-6 flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/akiba.jpg"
              alt="Akiba Logo"
              className="h-9 w-auto object-contain"
            />
          </div>

          {/* Header Typography */}
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Sign in to Akiba Hub
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Welcome back! Enter your credentials or choose a demo profile below.
          </p>

          {/* Main Login Form with distinct Top Labels (not hiding placeholders) */}
          <form onSubmit={submit} className="mt-8 space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="type your email here… (e.g. student@akibatech.com)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-500/20 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-14 text-sm text-slate-900 placeholder:text-slate-400 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-700 px-1 py-0.5 rounded focus:outline-none"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Error Notification Alert */}
            {error && (
              <div
                className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700"
                role="alert"
              >
                <Icon name="x" className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={busy}
              className="btn-primary flex w-full items-center justify-center gap-2 py-2.5 text-sm font-semibold shadow-sm hover:shadow transition-all disabled:opacity-50"
            >
              {busy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts Selector */}
          {/* <div className="mt-8 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Quick Demo Accounts
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                Password: <code className="font-mono text-slate-600">a2sv-demo</code>
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {DEMO_ACCOUNTS.map((account) => {
                const isSelected = email === account.email;
                return (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => fillDemo(account.email)}
                    className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                      isSelected
                        ? 'border-a2sv-500 bg-white shadow-xs ring-2 ring-a2sv-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${account.badgeColor}`}
                    >
                      {account.badge}
                    </span>
                    <span className="mt-1.5 text-xs font-semibold text-slate-900 truncate w-full">
                      {account.label}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate w-full">
                      {account.email}
                    </span>
                  </button>
                );
              })}
            </div>
          </div> */}

          {/* Register with Invite Link */}
          <div className="mt-6 text-center text-xs text-slate-500">
            <span>Have an invite token? </span>
            <Link
              href="/register-invite"
              className="font-semibold text-a2sv-600 hover:text-a2sv-700 hover:underline"
            >
              Register with invite code &rarr;
            </Link>
          </div>

          {/* Security / Enrollment note */}
          <p className="mt-6 text-center text-[11px] text-slate-400">
            Protected by Akiba Identity System • Enrollment is invite-only
          </p>
        </div>
      </div>
    </div>
  );
}
