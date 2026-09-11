'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OutlinedInput } from '@/components/form/field';

interface SuperGroupResponse {
  superGroup?: { id: string; name: string };
  error?: { message: string };
}

/** Create a new super group (SPEC §8.3). */
export function CreateSuperGroupForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Super group name is required.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/super-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const payload = (await res.json().catch(() => null)) as SuperGroupResponse | null;
      if (!res.ok) {
        setError(payload?.error?.message ?? 'Could not create super group.');
        return;
      }
      setError(null);
      setName('');
      router.refresh();
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-6">
      <h2 className="text-sm font-bold text-slate-900">New super group</h2>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <OutlinedInput
          label="Super group name"
          required
          placeholder="e.g. A2SV Ethiopia 2024"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Creating…' : 'Create super group'}
        </button>
      </form>
    </section>
  );
}