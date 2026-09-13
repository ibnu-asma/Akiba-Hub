'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OutlinedSelect } from '@/components/form/field';

interface InviteResult {
  id: string;
  orgEmail: string | null;
  personalEmail: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  inviteUrl: string;
}
interface MassResponse {
  invitations?: InviteResult[];
  error?: { message: string };
}

const ROLES = [
  { value: 'student', label: 'Student' },
  { value: 'head_of_education', label: 'Head of Education' },
  { value: 'head_of_academy', label: 'Head of Academy' },
];

/** CSV paste → org-email + invite-email form (SPEC §8.5, Akiba flow). */
export function GenerateInviteForm() {
  const router = useRouter();
  const [csv, setCsv] = useState('');
  const [role, setRole] = useState('student');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<InviteResult[] | null>(null);

  function parseRows(raw: string): { firstName: string; lastName: string; personalEmail: string }[] {
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(',').map((p) => p.trim());
        return { firstName: parts[0] ?? '', lastName: parts[1] ?? '', personalEmail: parts[2] ?? '' };
      })
      .filter((r) => r.firstName && r.lastName && /\S+@\S+\.\S+/.test(r.personalEmail));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const rows = parseRows(csv);
    if (rows.length === 0) {
      setError('Paste at least one valid row: FirstName,LastName,email@example.com');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/invitations/mass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, role }),
      });
      const payload = (await res.json().catch(() => null)) as MassResponse | null;
      if (!res.ok || !payload?.invitations) {
        setError(payload?.error?.message ?? 'Could not generate invitations.');
        return;
      }
      setCreated(payload.invitations);
      setCsv('');
      router.refresh();
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-6">
      <h2 className="text-sm font-bold text-slate-900">New invitations</h2>
      <p className="mt-1 text-xs text-slate-400">One person per line: FirstName, LastName, personal email.</p>
      <form onSubmit={submit} className="mt-4 space-y-5">
        <div>
          <label className="field-label" htmlFor="csv">Invite list</label>
          <textarea
            id="csv"
            rows={6}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={'Geleta,Daba,geleta.daba@gmail.com\nAbebe,Kebede,abebe.k@yahoo.com'}
            className="field-input resize-none font-mono text-sm"
          />
          <p className="mt-1 text-xs text-slate-400">
            Each person gets an org login email (first.last@akibatech.com) and an invite emailed to their personal address.
          </p>
        </div>

        <OutlinedSelect
          label="Role"
          value={role}
          onChange={setRole}
          options={ROLES}
          hint="The role each invited person gets."
        />

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Sending…' : `Send ${parseRows(csv).length || ''} invite${parseRows(csv).length === 1 ? '' : 's'}`}
        </button>
      </form>

      {created && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {created.length} invite{created.length === 1 ? '' : 's'} created
          </p>
          <ul className="space-y-2">
            {created.map((inv) => (
              <li key={inv.id} className="card-tint p-3">
                <p className="text-sm font-semibold text-slate-800">
                  {inv.firstName} {inv.lastName}
                </p>
                <p className="text-xs text-slate-500">
                  {inv.orgEmail} → {inv.personalEmail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
