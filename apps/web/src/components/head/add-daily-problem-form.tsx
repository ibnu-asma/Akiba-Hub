'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SelectProblems, type SelectProblemOption } from '@/components/form/select-problems';
import type { DailyProblemDto, ProblemDto, SuperGroup } from '@/lib/api';

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

  const problemOptions: SelectProblemOption[] = problems.map((p) => ({
    id: p.id,
    name: p.name,
    platform: p.platform,
    difficulty: p.difficulty,
    tags: p.tags,
  }));

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
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4 p-8 text-center sm:p-12 relative">
        <span aria-hidden="true" className="text-5xl block mb-4">
          🎯
        </span>
        <h2 className="text-xl font-extrabold text-slate-900">Daily problem assigned</h2>
        <p className="text-sm text-slate-500 font-medium">
          {created.problemName} · {created.date} — it refreshes every 24 hours and needs to be solved today!
        </p>
        <div className="flex items-center justify-center gap-3 mt-8 pt-4">
          <button type="button" className="btn-ghost px-5 py-2.5" onClick={() => {
            setCreated(null);
            setProblemId('');
          }}>
            Assign another
          </button>
          <button type="button" className="btn-primary px-5 py-2.5" onClick={() => router.push('/dashboard')}>
            Done
          </button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col relative">
      <div className="p-8 space-y-8">
        <section className="space-y-6">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Challenge Details</h2>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="superGroupId" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Super group
              </label>
              <select
                id="superGroupId"
                value={superGroupId}
                onChange={(e) => setSuperGroupId(e.target.value)}
                className={`w-full rounded-xl border bg-white px-3 py-3 text-sm text-slate-900 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-100 transition shadow-xs ${errors.superGroupId ? 'border-red-300 ring-1 ring-red-300' : 'border-slate-300'}`}
              >
                <option value="">Which cohort?</option>
                {superGroups.map((sg) => (
                  <option key={sg.id} value={sg.id}>
                    {sg.name}
                  </option>
                ))}
              </select>
              {errors.superGroupId && <p className="text-xs font-medium text-red-500 px-1">{errors.superGroupId}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="date" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Date
              </label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full rounded-xl border bg-white px-3 py-3 text-sm text-slate-900 focus:border-a2sv-500 focus:outline-none focus:ring-2 focus:ring-a2sv-100 transition shadow-xs ${errors.date ? 'border-red-300 ring-1 ring-red-300' : 'border-slate-300'}`}
              />
              {errors.date && <p className="text-xs font-medium text-red-500 px-1">{errors.date}</p>}
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Challenge problem
              </label>
              <SelectProblems
                placeholder="Search problems..."
                options={problemOptions}
                value={problemId ? [problemId] : []}
                onChange={(ids) => setProblemId(ids[0] ?? '')}
                multiple={false}
                error={errors.problemId}
              />
              {errors.problemId && <p className="text-xs font-medium text-red-500 px-1">{errors.problemId}</p>}
              {problems.length === 0 && !errors.problemId && (
                <p className="text-xs font-medium text-amber-600 px-1">Add problems first — the library is empty.</p>
              )}
            </div>
          </div>
        </section>

        {serverError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm text-center">
            <p className="text-sm font-bold text-red-600">{serverError}</p>
          </div>
        )}
      </div>

      <div className="bg-slate-50 px-8 py-5 flex items-center justify-end gap-3 border-t border-slate-100 rounded-b-2xl">
        <button
          type="button"
          className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          onClick={() => router.back()}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="btn-primary py-2 px-6 shadow-sm disabled:opacity-50 flex items-center gap-2"
        >
          {busy ? (
            <>
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Assigning...</span>
            </>
          ) : (
            'Assign daily problem'
          )}
        </button>
      </div>
    </form>
  );
}
