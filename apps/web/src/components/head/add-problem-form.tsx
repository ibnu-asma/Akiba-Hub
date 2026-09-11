'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PROBLEM_DIFFICULTIES, PROBLEM_PLATFORMS } from '@hub/shared';
import { OutlinedInput, OutlinedSelect, type SelectOption } from '@/components/form/field';

const PLATFORM_OPTIONS: SelectOption[] = [
  { value: PROBLEM_PLATFORMS.leetcode, label: 'LeetCode' },
  { value: PROBLEM_PLATFORMS.codeforces, label: 'Codeforces' },
  { value: PROBLEM_PLATFORMS.hackerrank, label: 'HackerRank' },
  { value: PROBLEM_PLATFORMS.other, label: 'Other' },
];

const DIFFICULTY_OPTIONS: SelectOption[] = [
  { value: PROBLEM_DIFFICULTIES.easy, label: 'Easy' },
  { value: PROBLEM_DIFFICULTIES.medium, label: 'Medium' },
  { value: PROBLEM_DIFFICULTIES.hard, label: 'Hard' },
];

/** HoE/HoA: add a DSA problem for the students to solve (SPEC §7.5). */
export function AddProblemForm() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [tags, setTags] = useState('');
  const [link, setLink] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function parseTags(): string[] {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Problem name is required';
    if (!platform) next.platform = 'Select the source platform';
    if (!difficulty) next.difficulty = 'Select a difficulty';
    if (!link.trim()) next.link = 'The problem link is required';
    else {
      try {
        new URL(link.trim());
      } catch {
        next.link = 'Enter a valid URL (e.g. https://leetcode.com/…)';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setServerError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), platform, difficulty, tags: parseTags(), link: link.trim() }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
      if (!res.ok) {
        setServerError(payload?.error?.message ?? 'Could not add the problem.');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setServerError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-6 p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <OutlinedInput label="Problem name" required placeholder="e.g. Two Sum" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        </div>
        <OutlinedSelect label="Platform" required options={PLATFORM_OPTIONS} value={platform} onChange={setPlatform} error={errors.platform} placeholder="Where is it hosted?" />
        <OutlinedSelect label="Difficulty" required options={DIFFICULTY_OPTIONS} value={difficulty} onChange={setDifficulty} error={errors.difficulty} placeholder="Easy / Medium / Hard" />
        <OutlinedInput
          label="Tags"
          placeholder="Array, Hash Table"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          hint="Comma separated — up to 8"
        />
        <OutlinedInput label="Problem link" required placeholder="https://leetcode.com/problems/…" value={link} onChange={(e) => setLink(e.target.value)} error={errors.link} />
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
          {busy ? 'Adding…' : 'Add problem'}
        </button>
      </div>
    </form>
  );
}