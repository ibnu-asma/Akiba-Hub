'use client';

import { useState } from 'react';
import { PROBLEM_DIFFICULTIES, PROBLEM_PLATFORMS } from '@hub/shared';
import { OutlinedInput, OutlinedSelect, type SelectOption } from '@/components/form/field';
import { Modal } from '@/components/modal';
import type { ProblemDto } from '@/lib/api';

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

/** Create/edit a problem (SPEC §7.5) — shared modal, with delete when editing. */
export function ProblemFormModal({
  problem,
  onClose,
  onSaved,
}: {
  problem?: ProblemDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(problem);
  const [name, setName] = useState(problem?.name ?? '');
  const [platform, setPlatform] = useState(problem?.platform ?? '');
  const [difficulty, setDifficulty] = useState(problem?.difficulty ?? '');
  const [tags, setTags] = useState((problem?.tags ?? []).join(', '));
  const [link, setLink] = useState(problem?.link ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parseTags(): string[] {
    return tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim() || !platform || !difficulty || !link.trim()) {
      setError('Name, platform, difficulty and link are required.');
      return;
    }
    setBusy(true);
    try {
      const url = isEdit ? `/api/admin/problems/${problem!.id}` : '/api/admin/problems';
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), platform, difficulty, tags: parseTags(), link: link.trim() }),
      });
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        setError(p?.error?.message ?? 'Could not save the problem.');
        return;
      }
      onSaved();
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!problem) return;
    if (!window.confirm(`Delete ${problem.name}?`)) return;
    await fetch(`/api/admin/problems/${problem.id}`, { method: 'DELETE' }).catch(() => null);
    onSaved();
    onClose();
  }

  return (
    <Modal title={<h2 className="text-base font-bold text-slate-900">{isEdit ? 'Edit problem' : 'Add problem'}</h2>} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <OutlinedInput label="Problem name" required placeholder="e.g. Two Sum" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <OutlinedSelect label="Platform" required options={PLATFORM_OPTIONS} value={platform} onChange={setPlatform} placeholder="Where is it hosted?" />
          <OutlinedSelect label="Difficulty" required options={DIFFICULTY_OPTIONS} value={difficulty} onChange={setDifficulty} placeholder="Easy / Medium / Hard" />
        </div>
        <OutlinedInput label="Tags" placeholder="Array, Hash Table" value={tags} onChange={(e) => setTags(e.target.value)} hint="Comma separated — up to 8" />
        <OutlinedInput label="Problem link" required placeholder="https://leetcode.com/problems/…" value={link} onChange={(e) => setLink(e.target.value)} />
        {error && <p className="field-error">{error}</p>}
        <div className="flex items-center justify-between gap-3">
          {isEdit ? (
            <button type="button" onClick={() => void remove()} className="text-sm font-semibold text-red-600 hover:underline">
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Saving…' : isEdit ? 'Save' : 'Add problem'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
