'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Checkbox, OutlinedInput, OutlinedSelect, type SelectOption } from '@/components/form/field';
import { SelectUser } from '@/components/form/select-user';
import { CONTEST_TYPES } from '@hub/shared';
import type { ContestDto, Group, ProblemDto } from '@/lib/api';

const TYPE_OPTIONS: SelectOption[] = [
  { value: CONTEST_TYPES.standard, label: 'Standard contest' },
  { value: CONTEST_TYPES.super, label: 'Super contest' },
];

interface ErrorResponse {
  error?: { message: string };
}

/**
 * HoE/HoA: add-contest form (SPEC §7.6) — schedule the contest, assign groups,
 * then attach contest questions (they get pseudo letters A, B, C…).
 */
export function AddContestForm({ groups, problems }: { groups: Group[]; problems: ProblemDto[] }) {
  const router = useRouter();

  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [type, setType] = useState<string>(CONTEST_TYPES.standard);
  const [unrated, setUnrated] = useState(false);
  const [date, setDate] = useState('');
  const [standingsLink, setStandingsLink] = useState('');
  const [groupIds, setGroupIds] = useState<string[]>([]);

  const [created, setCreated] = useState<ContestDto | null>(null);
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [questionsSaved, setQuestionsSaved] = useState<number | null>(null);
  const [attached, setAttached] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Contest name is required';
    if (!date) next.date = 'Pick the contest date';
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = 'Enter a valid date';
    if (standingsLink.trim() && !/^https?:\/\//.test(standingsLink.trim())) next.standingsLink = 'Enter a valid URL';
    if (groupIds.length === 0) next.groupIds = 'Assign at least one group';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setServerError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/contests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          number: number.trim() ? Number.parseInt(number, 10) : null,
          type,
          unrated,
          date,
          standingsLink: standingsLink.trim() || null,
          groupIds,
        }),
      });
      const payload = (await res.json().catch(() => null)) as ContestDto | ErrorResponse | null;
      if (!res.ok) {
        setServerError((payload as ErrorResponse)?.error?.message ?? 'Could not create the contest.');
        return;
      }
      setCreated(payload as ContestDto);
      setErrors({});
      router.refresh();
    } catch {
      setServerError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  async function attachQuestions() {
    if (!created || questionIds.length === 0) return;
    setServerError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/contests/${created.id}/problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemIds: questionIds }),
      });
      const payload = (await res.json().catch(() => null)) as { added?: number } | ErrorResponse | null;
      if (!res.ok) {
        setServerError((payload as ErrorResponse)?.error?.message ?? 'Could not attach contest questions.');
        return;
      }
      setQuestionsSaved((payload as { added?: number })?.added ?? 0);
      setAttached(true);
      router.refresh();
    } catch {
      setServerError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <section className="card space-y-5 p-6 sm:p-10">
        <div className="text-center">
          <span aria-hidden="true" className="text-4xl">
            🏆
          </span>
          <h2 className="mt-2 text-lg font-bold text-slate-900">Contest scheduled</h2>
          <p className="text-sm text-slate-500">
            {created.name} · {created.date} — students in {groupIds.length} group{groupIds.length === 1 ? '' : 's'} will
            see it under Contests.
          </p>
        </div>

        {attached ? (
          <div className="space-y-4 text-center">
            <p className="rounded-xl bg-a2sv-50 px-4 py-3 text-sm font-semibold text-a2sv-700">
              {questionsSaved} contest question{questionsSaved === 1 ? '' : 's'} attached — letters A, B, C… assigned.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href={`/contests/${created.id}`} className="btn-primary">
                View Contest Board →
              </Link>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setAttached(false);
                  setQuestionsSaved(null);
                  setQuestionIds([]);
                }}
              >
                Attach more
              </button>
              <button type="button" className="btn-secondary" onClick={() => router.push('/dashboard')}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-700">Add contest questions</p>
              <SelectUser
                label=""
                multiple
                placeholder="Select problems…"
                options={problems.map((p) => ({
                  id: p.id,
                  name: `${p.name} — ${p.difficulty.charAt(0).toUpperCase()}${p.difficulty.slice(1)}`,
                  role: p.platform,
                  group: p.tags[0] ?? null,
                }))}
                value={questionIds}
                onChange={setQuestionIds}
                hint={problems.length === 0 ? 'Add problems first — the library is empty.' : 'Each gets the next pseudo letter (A, B, C…).'}
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button type="button" className="btn-ghost" onClick={() => router.push('/dashboard')}>
                Skip for now
              </button>
              <button type="button" className="btn-primary" onClick={attachQuestions} disabled={busy || questionIds.length === 0}>
                {busy ? 'Attaching…' : `Attach ${questionIds.length || ''} question${questionIds.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        )}

        {serverError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {serverError}
          </p>
        )}
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-6 p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <OutlinedInput
            label="Contest name"
            required
            placeholder="e.g. A2SV Remote G5 Contest #31"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />
        </div>
        <OutlinedInput
          label="Contest number"
          type="number"
          placeholder="e.g. 31"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
        />
        <OutlinedSelect label="Contest type" options={TYPE_OPTIONS} value={type} onChange={setType} />
        <OutlinedInput label="Date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
        <OutlinedInput
          label="Standings link"
          placeholder="https://…"
          value={standingsLink}
          onChange={(e) => setStandingsLink(e.target.value)}
          error={errors.standingsLink}
          hint="Shown as the Standing badge"
        />
        <div className="flex items-end pb-2 sm:col-span-2">
          <Checkbox label="Unrated contest" checked={unrated} onChange={setUnrated} />
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">
          Participating groups
          {errors.groupIds && <span className="text-red-500"> *</span>}
        </p>
        <SelectUser
          label=""
          multiple
          placeholder="Select groups…"
          options={groups.map((g) => ({ id: g.id, name: g.name, role: 'Group', group: null }))}
          value={groupIds}
          onChange={setGroupIds}
          error={errors.groupIds}
        />
        <p className="mt-1 text-xs text-slate-400">Contest questions are upsolved by students in these groups.</p>
      </div>

      {serverError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {serverError}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <button type="button" className="btn-ghost" onClick={() => router.back()}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Scheduling…' : 'Schedule contest'}
        </button>
      </div>
    </form>
  );
}