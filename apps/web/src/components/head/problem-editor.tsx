'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OutlinedInput, OutlinedSelect } from '@/components/form/field';
import type { ProblemDto } from '@/lib/api';

const DIFF_FILTER = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const PLATFORMS = [
  { value: 'leetcode', label: 'LeetCode' },
  { value: 'codeforces', label: 'Codeforces' },
  { value: 'hackerrank', label: 'HackerRank' },
  { value: 'other', label: 'Other' },
];

export function ProblemEditor({ problem }: { problem?: ProblemDto }) {
  const router = useRouter();

  const [name, setName] = useState(problem?.name ?? '');
  const [platform, setPlatform] = useState(problem?.platform ?? 'leetcode');
  const [difficulty, setDifficulty] = useState(problem?.difficulty ?? 'medium');
  const [tags, setTags] = useState((problem?.tags ?? []).join(', '));
  const [link, setLink] = useState(problem?.link ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function parseTags(): string[] {
    return tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Name is required';
    if (!link.trim()) next.link = 'Link is required';
    else if (!link.startsWith('http')) next.link = 'Must be a valid URL';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setError(null);
    try {
      const payload = { name, platform, difficulty, tags: parseTags(), link };
      const url = problem ? `/api/admin/problems/${problem.id}` : '/api/admin/problems';
      const method = problem ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        setError(data?.error?.message ?? 'Could not save the problem.');
        return;
      }
      
      router.push('/problems');
      router.refresh();
    } catch {
      setError('Network error. Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="space-y-6">
        <OutlinedInput
          label="Problem Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Two Sum"
          error={errors.name}
          hint="The exact title of the problem."
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <OutlinedSelect
            label="Platform"
            value={platform}
            onChange={setPlatform}
            options={PLATFORMS}
          />
          <OutlinedSelect
            label="Difficulty"
            value={difficulty}
            onChange={setDifficulty}
            options={DIFF_FILTER}
          />
        </div>

        <OutlinedInput
          label="Problem URL"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://leetcode.com/problems/..."
          error={errors.link}
        />

        <OutlinedInput
          label="Tags (comma separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g. arrays, hash-table, two-pointers"
          hint="Up to 8 tags to help students filter problems."
        />

        {error && <p className="text-sm font-semibold text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
        <div>
          {problem && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (!confirm('Are you sure you want to delete this problem?')) return;
                setBusy(true);
                try {
                  await fetch(`/api/admin/problems/${problem.id}`, { method: 'DELETE' });
                  router.push('/problems');
                  router.refresh();
                } catch {
                  setError('Failed to delete problem.');
                  setBusy(false);
                }
              }}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
            >
              Delete Problem
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/problems')}
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-a2sv-600 px-6 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-a2sv-700 active:scale-95 disabled:opacity-50"
          >
            {busy ? 'Saving...' : problem ? 'Save Changes' : 'Create Problem'}
          </button>
        </div>
      </div>
    </form>
  );
}
