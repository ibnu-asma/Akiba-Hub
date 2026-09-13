'use client';

import { useCallback, useEffect, useState } from 'react';
import { OutlinedSelect } from '@/components/form/field';
import { ProblemFormModal } from '@/components/head/problem-form-modal';
import type { ProblemDto } from '@/lib/api';

const PAGE_SIZE = 10;

const DIFF_FILTER = [
  { value: '', label: 'All difficulties' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const DIFF_BADGE: Record<string, string> = {
  easy: 'bg-a2sv-50 text-a2sv-700',
  medium: 'bg-amber-50 text-amber-700',
  hard: 'bg-red-50 text-red-700',
};

/** HoE/HoA: problem management — list, filter, paginate, create/edit/delete (SPEC §7.5). */
export function ProblemsManager() {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [topic, setTopic] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ rows: ProblemDto[]; total: number }>({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editProblem, setEditProblem] = useState<ProblemDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
      if (q) params.set('q', q);
      if (difficulty) params.set('difficulty', difficulty);
      if (tagFilter) params.set('tag', tagFilter);
      const res = await fetch(`/api/admin/problems?${params.toString()}`);
      const payload = (await res.json().catch(() => null)) as { rows?: ProblemDto[]; total?: number } | null;
      if (res.ok && payload) setData({ rows: payload.rows ?? [], total: payload.total ?? 0 });
      else setData({ rows: [], total: 0 });
    } catch {
      setData({ rows: [], total: 0 });
    } finally {
      setLoading(false);
    }
  }, [q, difficulty, tagFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  function applySearch() {
    setQ(search.trim());
    setPage(0);
  }

  function applyTopic() {
    setTagFilter(topic.trim());
    setPage(0);
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <form onSubmit={(e) => { e.preventDefault(); applySearch(); }} className="flex items-end gap-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search problems…" className="field-input w-48 py-2 text-sm" />
            <button type="submit" className="btn-primary px-4 py-2 text-sm">Search</button>
          </form>
          <div className="w-44">
            <OutlinedSelect label="Difficulty" value={difficulty} onChange={(v) => { setDifficulty(v); setPage(0); }} placeholder="All difficulties" options={DIFF_FILTER} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); applyTopic(); }} className="flex items-end gap-2">
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (e.g. Array)" className="field-input w-44 py-2 text-sm" />
            <button type="submit" className="btn-ghost px-3 py-2 text-sm">Filter</button>
          </form>
        </div>
        <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>+ Add problem</button>
      </div>

      <section className="card overflow-hidden">
        {loading ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">Loading…</p>
        ) : data.rows.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">No problems match.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Problem</th>
                <th className="px-4 py-3 font-semibold">Difficulty</th>
                <th className="px-4 py-3 font-semibold">Tags</th>
                <th className="px-4 py-3 font-semibold">Link</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-3">
                    <p className="truncate text-sm font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs capitalize text-slate-400">{p.platform}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`chip capitalize ${DIFF_BADGE[p.difficulty] ?? 'bg-slate-100 text-slate-600'}`}>{p.difficulty}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex max-w-[200px] flex-wrap gap-1">
                      {p.tags.length === 0 ? <span className="text-xs text-slate-400">—</span> : p.tags.slice(0, 3).map((t) => (
                        <span key={t} className="chip bg-slate-100 text-slate-600">{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <a href={p.link} target="_blank" rel="noreferrer" className="text-xs font-semibold text-a2sv-600 hover:underline">Open ↗</a>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setEditProblem(p)} className="btn-ghost px-2.5 py-1 text-xs">Edit</button>
                      <button
                        type="button"
                        onClick={() => void (async () => {
                          if (!window.confirm(`Delete ${p.name}?`)) return;
                          await fetch(`/api/admin/problems/${p.id}`, { method: 'DELETE' }).catch(() => null);
                          void load();
                        })()}
                        className="btn-ghost px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{data.total} total</span>
        <div className="flex items-center gap-3">
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            ← Prev
          </button>
          <span className="text-xs text-slate-400">Page {page + 1} of {totalPages}</span>
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next →
          </button>
        </div>
      </div>

      {createOpen && (
        <ProblemFormModal
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            void load();
          }}
        />
      )}

      {editProblem && (
        <ProblemFormModal
          problem={editProblem}
          onClose={() => setEditProblem(null)}
          onSaved={() => {
            setEditProblem(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

