'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OutlinedInput, OutlinedSelect, type SelectOption } from '@/components/form/field';
import type { DailyProblemDto, ProblemDto, SuperGroup } from '@/lib/api';

const SG_OPTIONS = (superGroups: SuperGroup[]): SelectOption[] =>
  superGroups.map((sg) => ({ value: sg.id, label: sg.name }));

const PROBLEM_OPTIONS = (problems: ProblemDto[]): SelectOption[] =>
  problems.map((p) => ({
    value: p.id,
    label: `${p.name} — ${p.difficulty.charAt(0).toUpperCase()}${p.difficulty.slice(1)} · ${p.platform}`,
  }));

/** HoE/HoA: assign the 24-hour daily problem challenge for a super group (SPEC §7.7). */
export function AddDailyProblemForm({
  superGroups,
  problems,
}: {
  superGroups: SuperGroup[];
  problems: ProblemDto[];
}) {
  const router = useRouter();

  const [superGroupId, setSuperGroupId] = useState('');
  const [problemId, setProblemId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [created, setCreated] = useState<DailyProblemDto | null>(null);
  const [busy, setBusy] = useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!superGroupId) next.superGroupId = 'Select the super group';
    if (!problemId) next.problemId = 'Pick the challenge problem';
    if (!date.trim()) next.date = 'Pick the date';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setServerError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/daily-problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ superGroupId, problemId, date: date.trim() }),
      });
      const payload = (await res.json().catch(() => null)) as DailyProblemDto | { error?: { message: string } } | null;
      if (!res.ok) {
        setServerError((payload as { error?: { message: string } })?.error?.message ?? 'Could not assign the daily problem.');
        return;
      }
      setCreated(payload as DailyProblemDto);
    } catch {
      setServerError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <section className="card space-y-4 p-6 text-center sm:p-10">
        <span aria-hidden="true" className="text-4xl">
          🎯
        </span>
        <h2 className="text-lg font-bold text-slate-900">Daily problem assigned</h2>
        <p className="text-sm text-slate-500">
          {created.problemName} · {created.date} — it refreshes every 24 hours and needs to be solved today!
        </p>
        <div className="flex items-center justify-center gap-3">
          <button type="button" className="btn-ghost" onClick={() => setCreated(null)}>
            Assign another
          </button>
          <button type="button" className="btn-primary" onClick={() => router.push('/dashboard')}>
            Done
          </button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-6 p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <OutlinedSelect
          label="Super group"
          required
          options={SG_OPTIONS(superGroups)}
          value={superGroupId}
          onChange={setSuperGroupId}
          error={errors.superGroupId}
          placeholder="Which cohort?"
        />
        <OutlinedInput label="Date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
        <div className="sm:col-span-2">
          <OutlinedSelect
            label="Challenge problem"
            required
            options={PROBLEM_OPTIONS(problems)}
            value={problemId}
            onChange={setProblemId}
            error={errors.problemId}
            placeholder="Newest problems first"
            hint={problems.length === 0 ? 'Add problems first — the library is empty.' : undefined}
          />
        </div>
      </div>

      {serverError && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>}

      <div className="flex items-center justify-end gap-3">
        <button type="button" className="btn-ghost" onClick={() => router.back()}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Assigning…' : 'Assign daily problem'}
        </button>
      </div>
    </form>
  );
}