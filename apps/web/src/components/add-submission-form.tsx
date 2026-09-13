'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OutlinedInput, OutlinedSelect } from '@/components/form/field';

const LANGUAGES = [
  'Python', 'C', 'C++', 'Java', 'C#', 'Visual Basic .NET', 'JavaScript', 'TypeScript',
  'SQL', 'Assembly', 'PHP', 'R', 'Go', 'MATLAB', 'Swift', 'Ruby', 'Perl', 'Objective-C',
  'Kotlin', 'Rust',
].map((lang) => ({ value: lang, label: lang }));

/** Add Submission — time, tries, language, and an Edit/Preview code editor (SPEC §6.4). */
export function AddSubmissionForm({ problemId }: { problemId: string }) {
  const router = useRouter();
  const [timeSpentMin, setTimeSpentMin] = useState('');
  const [tries, setTries] = useState('1');
  const [language, setLanguage] = useState('');
  const [code, setCode] = useState('');
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      router.push('/problems');
      router.refresh();
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
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
            rows={10}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 font-mono text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-a2sv-500 focus:ring-2 focus:ring-a2sv-100"
          />
        ) : (
          <pre className="max-h-80 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3.5 font-mono text-sm text-slate-800">
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
