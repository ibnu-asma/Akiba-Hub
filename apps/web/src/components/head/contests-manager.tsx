'use client';

import { useCallback, useEffect, useState } from 'react';
import { OutlinedInput, OutlinedSelect, type SelectOption } from '@/components/form/field';
import { ContestFormModal } from '@/components/head/contest-form-modal';
import { ContestDetailModal } from '@/components/head/contest-detail-modal';
import { formatDate } from '@/lib/format';
import type { ContestDto, Group, ProblemDto } from '@/lib/api';

const PAGE_SIZE = 10;
const ALL_TYPES = '__all__';

const TYPE_FILTERS: SelectOption[] = [
  { value: ALL_TYPES, label: 'All types' },
  { value: 'standard', label: 'Standard' },
  { value: 'super', label: 'Super' },
];

interface ListResponse {
  rows: ContestDto[];
  total: number;
}

/** HoE/HoA: contest management — search, filter, pagination, create/edit/delete (SPEC §7.7). */
export function ContestsManager({
  initial,
  groups,
  problems,
}: {
  initial: ListResponse;
  groups: Group[];
  problems: ProblemDto[];
}) {
  const [rows, setRows] = useState<ContestDto[]>(initial.rows);
  const [total, setTotal] = useState(initial.total);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [type, setType] = useState(ALL_TYPES);

  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<ContestDto | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const reload = useCallback(
    async (targetPage = page, search = q, typeFilter = type) => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((targetPage - 1) * PAGE_SIZE) });
      if (search.trim()) params.set('q', search.trim());
      if (typeFilter !== ALL_TYPES) params.set('type', typeFilter);
      const res = await fetch(`/api/admin/contests?${params.toString()}`);
      const data = (await res.json().catch(() => null)) as ListResponse | null;
      if (res.ok && data) {
        setRows(data.rows);
        setTotal(data.total);
      }
    },
    [page, q, type],
  );

  useEffect(() => {
    void reload(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type]);

  function go(pageNum: number) {
    setPage(pageNum);
    void reload(pageNum);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-64">
          <OutlinedInput label="Search" placeholder="Contest name…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="w-full sm:w-48">
          <OutlinedSelect label="Type" value={type} onChange={setType} options={TYPE_FILTERS} />
        </div>
        <div className="ml-auto">
          <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
            + New contest
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <section className="card p-10 text-center">
          <p className="text-3xl">🏆</p>
          <p className="mt-2 text-sm text-slate-500">No contests found.</p>
        </section>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setDetail(c)}
                className="card group flex h-full w-full flex-col p-5 text-left transition hover:border-a2sv-400 hover:ring-2 hover:ring-a2sv-100"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`chip ${c.type === 'super' ? 'bg-violet-600 text-white' : 'bg-a2sv-500 text-white'}`}>
                    {c.type === 'super' ? 'Super' : 'Standard'}
                  </span>
                  {c.unrated && <span className="chip bg-slate-100 text-slate-500">Unrated</span>}
                  {c.standingsLink && <span className="chip bg-slate-100 text-a2sv-600">Standing ↗</span>}
                </div>
                <h3 className="mt-2 truncate text-base font-bold text-slate-900">
                  {c.number ? `${c.name} #${c.number}` : c.name}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {formatDate(c.date)} · {c.problemCount} question{c.problemCount === 1 ? '' : 's'}
                </p>
                {c.groupNames.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.groupNames.map((g) => (
                      <span key={g} className="chip bg-slate-100 text-slate-500">
                        {g}
                      </span>
                    ))}
                  </div>
                )}
                <span className="mt-auto pt-3 text-right text-xs font-semibold text-a2sv-600 opacity-0 transition group-hover:opacity-100">
                  View details →
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button type="button" className="btn-ghost" disabled={page <= 1} onClick={() => go(page - 1)}>
            ← Prev
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages} · {total} total
          </span>
          <button type="button" className="btn-ghost" disabled={page >= totalPages} onClick={() => go(page + 1)}>
            Next →
          </button>
        </div>
      )}

      {createOpen && (
        <ContestFormModal
          groups={groups}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            void reload(1);
          }}
        />
      )}

      {detail && (
        <ContestDetailModal
          contest={detail}
          groups={groups}
          allProblems={problems}
          onClose={() => setDetail(null)}
          onChanged={() => void reload(page)}
        />
      )}
    </div>
  );
}
