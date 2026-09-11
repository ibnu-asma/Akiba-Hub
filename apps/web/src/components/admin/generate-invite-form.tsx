'use client';

import { useState } from 'react';
import { OutlinedInput, OutlinedSelect } from '@/components/form/field';

interface InviteLink {
  token: string;
  email: string | null;
  role: string;
}

interface MassResponse {
  invitations?: InviteLink[];
  error?: { message: string };
}

/** Bulk-emails → invite links form (SPEC §8.5), with one-tap copy. */
export function GenerateInviteForm() {
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<InviteLink[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function parseEmails(raw: string): string[] {
    return raw
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const valid = parseEmails(emails);
    if (valid.length === 0) {
      setError('Enter at least one valid email (comma or newline separated).');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/invitations/mass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: valid, role }),
      });
      const payload = (await res.json().catch(() => null)) as MassResponse | null;
      if (!res.ok || !payload?.invitations) {
        setError(payload?.error?.message ?? 'Could not generate invitations.');
        return;
      }
      setCreated(payload.invitations);
      setEmails('');
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  function inviteUrl(token: string, email: string | null): string {
    const base = `${window.location.origin}/register-invite?token=${token}`;
    return email ? `${base}&email=${encodeURIComponent(email)}` : base;
  }

  async function copy(url: string, token: string) {
    await navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <section className="card p-6">
      <h2 className="text-sm font-bold text-slate-900">New invitations</h2>
      <form onSubmit={submit} className="mt-4 space-y-5">
        <div>
          <label className="field-label" htmlFor="emails">Emails</label>
          <textarea
            id="emails"
            rows={5}
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="geleta.daba@a2sv.org, abebe.kebede@a2sv.org&#10;one-per-line works too"
            className="field-input resize-none"
          />
          <p className="mt-1 text-xs text-slate-400">Comma, semicolon or newline separated — one invite per email.</p>
        </div>

        <OutlinedSelect
          label="Role"
          value={role}
          onChange={setRole}
          options={[
            { value: 'student', label: 'Student' },
            { value: 'head_of_education', label: 'Head of Education' },
          ]}
          hint="Students land in their group; HoE roles get the education section."
        />

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Generating…' : `Generate ${parseEmails(emails).length || ''} invite${parseEmails(emails).length === 1 ? '' : 's'}`}
        </button>
      </form>

      {created && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {created.length} invite link{created.length === 1 ? '' : 's'} created
          </p>
          <ul className="space-y-2">
            {created.map((inv) => {
              const url = inviteUrl(inv.token, inv.email);
              return (
                <li key={inv.token} className="card-tint p-2.5">
                  <p className="truncate text-xs font-medium text-slate-600">{inv.email}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <OutlinedInput
                      label="Invite link"
                      value={url}
                      readOnly
                      onChange={() => undefined}
                    />
                  </div>
                  <button type="button" onClick={() => copy(url, inv.token)} className="btn-primary mt-2 w-full !py-2 text-xs">
                    {copied === inv.token ? 'Copied ✓' : 'Copy link'}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}