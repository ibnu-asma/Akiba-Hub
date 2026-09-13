'use client';

import { useEffect, useMemo, useState } from 'react';
import { Checkbox, OutlinedInput, OutlinedSelect, type SelectOption } from '@/components/form/field';
import { SelectUser, type SelectUserOption } from '@/components/form/select-user';
import { Modal } from '@/components/modal';
import { CONTEST_TYPES } from '@hub/shared';
import type { ContestDto, ContestProblemDto, Group, ProblemDto } from '@/lib/api';

const TYPE_OPTIONS: SelectOption[] = [
  { value: CONTEST_TYPES.standard, label: 'Standard contest' },
  { value: CONTEST_TYPES.super, label: 'Super contest' },
];

/** Contest detail — edit, manage questions (letters), delete (SPEC §7.7). */
export function ContestDetailModal({
  contest,
  groups,
  allProblems,
  onClose,
  onChanged,
}: {
  contest: ContestDto;
  groups: Group[];
  allProblems: ProblemDto[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState(contest.name);
  const [number, setNumber] = useState(contest.number != null ? String(contest.number) : '');
  const [type, setType] = useState<string>(contest.type);
  const [unrated, setUnrated] = useState(contest.unrated);
  const [date, setDate] = useState(contest.date.slice(0, 10));
  const [standingsLink, setStandingsLink] = useState(contest.standingsLink ?? '');
  const [groupIds, setGroupIds] = useState<string[]>(contest.groupIds ?? []);

  const [problems, setProblems] = useState<ContestProblemDto[]>([]);
  const [addSel, setAddSel] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addOptions = useMemo<SelectUserOption[]>(
    () => allProblems.map((p) => ({ id: p.id, name: p.name, role: p.difficulty, group: p.platform })),
    [allProblems],
  );

  function loadProblems() {
    fetch(`/api/admin/contests/${contest.id}/problems`)
      .then((r) => r.json())
      .then((d) => setProblems(Array.isArray(d) ? (d as ContestProblemDto[]) : []))
      .catch(() => setProblems([]));
  }

  useEffect(() => {
    loadProblems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contest.id]);

  async function saveDetails() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/contests/${contest.id}`, {
        method: 'PATCH',
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
      if (!res.ok) {
        const parsed = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        setError(parsed?.error?.message ?? 'Could not save.');
        return;
      }
      setSaved(true);
      onChanged();
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }
  async function addProblems() {
    if (addSel.length === 0) {
      setError('Select at least one problem.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/contests/${contest.id}/problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemIds: addSel }),
      });
      if (!res.ok) {
        const parsed = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        setError(parsed?.error?.message ?? 'Could not attach problems.');
        return;
      }
      setAddSel([]);
      loadProblems();
      onChanged();
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  async function removeProblem(problemId: string) {
    await fetch(`/api/admin/contests/${contest.id}/problems/${problemId}`, { method: 'DELETE' }).catch(() => null);
    loadProblems();
    onChanged();
  }

  async function del() {
    if (!window.confirm(`Delete ${contest.name}?`)) return;
    await fetch(`/api/admin/contests/${contest.id}`, { method: 'DELETE' }).catch(() => null);
    onChanged();
    onClose();
  }

  return (
    <Modal title={<h2 className="truncate text-base font-bold text-slate-900">{contest.name}</h2>} onClose={onClose}>
      <div className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Details</h3>
          <OutlinedInput label="Contest name" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <OutlinedInput label="Contest number" type="number" value={number} onChange={(e) => setNumber(e.target.value)} />
            <OutlinedSelect label="Contest type" options={TYPE_OPTIONS} value={type} onChange={setType} />
            <OutlinedInput label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <OutlinedInput label="Standings link" value={standingsLink} onChange={(e) => setStandingsLink(e.target.value)} />
          </div>
          <div className="flex items-center">
            <Checkbox label="Unrated contest" checked={unrated} onChange={setUnrated} />
          </div>
          <SelectUser
            label="Participating groups"
            multiple
            placeholder="Select groups…"
            options={groups.map((g) => ({ id: g.id, name: g.name, role: 'Group', group: null }))}
            value={groupIds}
            onChange={setGroupIds}
          />
          <div className="flex items-center justify-end gap-3">
            {saved && <span className="text-xs font-semibold text-a2sv-600">Saved ✓</span>}
            <button type="button" className="btn-primary px-4 py-2 text-sm" disabled={busy} onClick={() => void saveDetails()}>
              Save details
            </button>
          </div>
        </section>

        <section className="space-y-3 border-t border-slate-100 pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Problems ({problems.length})</h3>
          <SelectUser label="Add problems" multiple placeholder="Search problems…" options={addOptions} value={addSel} onChange={setAddSel} />
          <button type="button" className="btn-primary px-4 py-2 text-sm" disabled={busy} onClick={() => void addProblems()}>
            Add problems
          </button>
          {problems.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {problems.map((p) => (
                <li key={p.problemId} className="flex items-center gap-3 py-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                    {p.pseudo}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{p.name}</p>
                    <p className="text-xs capitalize text-slate-400">
                      {p.difficulty} · {p.platform}
                    </p>
                  </div>
                  {p.link && (
                    <a href={p.link} target="_blank" rel="noreferrer" className="text-xs font-semibold text-a2sv-600 hover:underline">
                      Open ↗
                    </a>
                  )}
                  <button type="button" onClick={() => void removeProblem(p.problemId)} className="text-xs font-semibold text-red-500 hover:underline">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {error && <p className="field-error">{error}</p>}

        <section className="border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => void del()}
            className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            Delete contest
          </button>
        </section>
      </div>
    </Modal>
  );
}

