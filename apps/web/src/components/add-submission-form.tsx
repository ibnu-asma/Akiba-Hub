'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OutlinedInput, OutlinedSelect } from '@/components/form/field';

const LANGUAGES = [
  'Python', 'C', 'C++', 'Java', 'C#', 'Visual Basic .NET', 'JavaScript', 'TypeScript',
  'SQL', 'Assembly', 'PHP', 'R', 'Go', 'MATLAB', 'Swift', 'Ruby', 'Perl', 'Objective-C',
  'Kotlin', 'Rust',
].map((lang) => ({ value: lang, label: lang }));

import { type SubmissionDto } from '@/lib/api';

/** Add Submission — time, tries, language, and an Edit/Preview code editor (SPEC §6.4). */
export function AddSubmissionForm({ problemId, previousSubmission }: { problemId: string; previousSubmission?: SubmissionDto }) {
  const router = useRouter();
  const [timeSpentMin, setTimeSpentMin] = useState(previousSubmission?.timeSpentMin?.toString() ?? '');
  const [tries, setTries] = useState(previousSubmission?.tries?.toString() ?? '1');
  const [language, setLanguage] = useState(previousSubmission?.language ?? '');
  const [code, setCode] = useState(previousSubmission?.code ?? '');
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`draft-submission-${problemId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.timeSpentMin) setTimeSpentMin(parsed.timeSpentMin);
        if (parsed.tries) setTries(parsed.tries);
        if (parsed.language) setLanguage(parsed.language);
        if (parsed.code) setCode(parsed.code);
      } catch {}
    }
  }, [problemId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(`draft-submission-${problemId}`, JSON.stringify({
        timeSpentMin, tries, language, code
      }));
    }, 500);
    return () => clearTimeout(timer);
  }, [timeSpentMin, tries, language, code, problemId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const next: Record<string, string> = {};
    const timeNum = Number(timeSpentMin);
    const triesNum = Number(tries);
    if (!timeSpentMin.trim() || Number.isNaN(timeNum) || timeNum < 0) next.timeSpentMin = 'Enter minutes spent';
    if (!tries.trim() || Number.isNaN(triesNum) || triesNum < 1) next.tries = 'Enter the number of tries (≥ 1)';
    if (!language) next.language = 'Pick a language';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId,
          language,
          code: code || null,
          timeSpentMin: timeNum,
          tries: triesNum,
          source: 'manual',
        }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
      if (!res.ok) {
        setError(payload?.error?.message ?? 'Could not save the submission.');
        return;
      }
      localStorage.removeItem(`draft-submission-${problemId}`);
      router.push('/problems');
      router.refresh();
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-5 p-6 sm:p-8 bg-white rounded-2xl shadow-sm border border-slate-200/60">
      {previousSubmission && (
        <div className="rounded-xl bg-blue-50/50 p-3.5 border border-blue-100/50 flex items-start gap-3">
          <div className="mt-0.5 grid place-items-center h-5 w-5 rounded-full bg-blue-100 text-blue-600">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-blue-800">
            <strong>We loaded your last submission.</strong> You can review or update your code and time spent.
          </p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <OutlinedInput
          label="Time spent (minutes)"
          type="number"
          min="0"
          step="1"
          required
          value={timeSpentMin}
          onChange={(e) => setTimeSpentMin(e.target.value)}
          error={errors.timeSpentMin}
          placeholder="0"
        />
        <OutlinedInput
          label="Tries"
          type="number"
          min="1"
          step="1"
          required
          value={tries}
          onChange={(e) => setTries(e.target.value)}
          error={errors.tries}
          placeholder="1"
        />
      </div>

      <OutlinedSelect
        label="Language"
        options={LANGUAGES}
        value={language}
        onChange={setLanguage}
        required
        error={errors.language}
        placeholder="Select language…"
      />

      <div>
        <div className="mb-1.5 flex items-center gap-1">
          <button type="button" onClick={() => setTab('edit')} className={`chip ${tab === 'edit' ? 'bg-a2sv-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
            Edit
          </button>
          <button type="button" onClick={() => setTab('preview')} className={`chip ${tab === 'preview' ? 'bg-a2sv-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
            Preview
          </button>
        </div>
        {tab === 'edit' ? (
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="// Paste your solution…"
            rows={12}
            className="w-full rounded-xl border border-slate-300 bg-slate-900 px-4 py-4 font-mono text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-a2sv-500 focus:ring-2 focus:ring-a2sv-500/20"
            spellCheck={false}
          />
        ) : (
          <pre className="max-h-[500px] overflow-auto rounded-xl border border-slate-700 bg-slate-900 p-4 font-mono text-sm text-slate-100 shadow-inner">
            {code
              .split('\n')
              .map((line, i) => `${String(i + 1).padStart(2, ' ')} | ${line}`)
              .join('\n') || '// Nothing to preview yet.'}
          </pre>
        )}
      </div>

      {error && <p className="field-error">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  );
}
