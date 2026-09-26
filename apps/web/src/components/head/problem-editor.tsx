'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  { value: 'codesignal', label: 'CodeSignal' },
  { value: 'atcoder', label: 'AtCoder' },
  { value: 'geeksforgeeks', label: 'GeeksForGeeks' },
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
  const [confirmDelete, setConfirmDelete] = useState(false);

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
      
      window.location.href = '/problems';
    } catch {
      setError('Network error. Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden">
      <div className="p-8 space-y-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Problem Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Two Sum"
            className={`w-full rounded-xl border ${errors.name ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-a2sv-500 focus:ring-a2sv-100'} bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none hover:border-slate-300 focus:ring-2 transition shadow-sm`}
          />
          {errors.name ? <p className="text-xs text-red-500">{errors.name}</p> : <p className="text-xs text-slate-400">The exact title of the problem.</p>}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none hover:border-slate-300 focus:border-a2sv-500 focus:ring-2 focus:ring-a2sv-100 transition shadow-sm"
            >
              {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none hover:border-slate-300 focus:border-a2sv-500 focus:ring-2 focus:ring-a2sv-100 transition shadow-sm"
            >
              {DIFF_FILTER.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Problem URL</label>
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://leetcode.com/problems/..."
            className={`w-full rounded-xl border ${errors.link ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-a2sv-500 focus:ring-a2sv-100'} bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none hover:border-slate-300 focus:ring-2 transition shadow-sm`}
          />
          {errors.link && <p className="text-xs text-red-500">{errors.link}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tags (comma separated)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. arrays, hash-table, two-pointers"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none hover:border-slate-300 focus:border-a2sv-500 focus:ring-2 focus:ring-a2sv-100 transition shadow-sm"
          />
          <p className="text-xs text-slate-400">Up to 8 tags to help students filter problems.</p>
        </div>

        {error && <p className="text-sm font-semibold text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
      </div>

      <div className="bg-slate-50/50 flex items-center justify-between border-t border-slate-100 px-8 py-5">
        <div>
          {problem && (
            confirmDelete ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-700">Are you sure?</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await fetch(`/api/admin/problems/${problem.id}`, { method: 'DELETE' });
                      window.location.href = '/problems';
                    } catch {
                      setError('Failed to delete problem.');
                      setBusy(false);
                      setConfirmDelete(false);
                    }
                  }}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-white bg-red-600 transition hover:bg-red-700 shadow-xs disabled:opacity-50"
                >
                  Yes, Delete
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100 hover:text-red-700 disabled:opacity-50"
              >
                Delete Problem
              </button>
            )
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.location.href = '/problems'}
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
