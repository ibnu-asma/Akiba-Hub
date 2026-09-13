'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDateTime } from '@/lib/format';

interface InvitationRow {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  personalEmail: string | null;
  role: string;
  mass: boolean;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}
interface InvitationListResponse {
  rows: InvitationRow[];
  total: number;
  error?: { message: string };
}

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'used', label: 'Used' },
  { key: 'expired', label: 'Expired' },
  { key: 'revoked', label: 'Revoked' },
];

const LIMIT = 10;

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  used: 'bg-a2sv-100 text-a2sv-700',
  expired: 'bg-slate-100 text-slate-500',
  revoked: 'bg-red-50 text-red-600',
};

function statusOf(row: InvitationRow): keyof typeof STATUS_STYLE {
  if (row.revokedAt) return 'revoked';
  if (row.usedAt) return 'used';
  if (new Date(row.expiresAt) < new Date()) return 'expired';
  return 'pending';
}

/** Issued-invitations tracker — filter, search, pagination, resend + revoke (SPEC §8.5). */
export function InvitationsBoard() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<InvitationListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(page * LIMIT) });
      if (status) params.set('status', status);
      if (q) params.set('q', q);
      const res = await fetch(`/api/admin/invitations?${params.toString()}`);
      const payload = (await res.json().catch(() => null)) as InvitationListResponse | null;
      if (!res.ok || !payload) {
        setError(payload?.error?.message ?? 'Could not load invitations.');
        return;
      }
      setData(payload);
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setLoading(false);
    }
  }, [status, q, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function action(id: string, kind: 'resend' | 'revoke') {
    await fetch(`/api/admin/invitations/${id}/${kind}`, { method: 'POST' }).catch(() => null);
    void load();
  }

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-bold text-slate-900">Issued invitations</h2>
        <span className="chip bg-a2sv-50 text-a2sv-700">{total} total</span>
      </div>

      <div className="space-y-3 border-b border-slate-100 px-5 py-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setStatus(f.key);
                setPage(0);
              }}
              className={`chip px-3 py-1.5 text-sm transition ${
                status === f.key ? 'bg-a2sv-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQ(search.trim());
            setPage(0);
          }}
          className="flex gap-2"
        >
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email…" className="field-input py-2 text-sm" />
          <button type="submit" className="btn-primary px-4 py-2 text-sm">
            Search
          </button>
        </form>
      </div>

      {error && <p className="px-5 pt-3 text-xs text-red-500">{error}</p>}

      {loading ? (
        <p className="px-5 py-10 text-center text-sm text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-400">No invitations match.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((row) => {
            const statusKey = statusOf(row);
            const canResend = statusKey !== 'used';
            const canRevoke = statusKey === 'pending' || statusKey === 'expired';
            return (
              <li key={row.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-a2sv-50 text-a2sv-600">✉</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {row.firstName && row.lastName ? `${row.firstName} ${row.lastName}` : 'take-over invite'}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {row.email ?? '—'} → {row.personalEmail ?? '—'} · {row.role} · expires {formatDateTime(row.expiresAt)}
                  </p>
                </div>
                <span className={`chip ${STATUS_STYLE[statusKey]}`}>{statusKey}</span>
                <div className="flex gap-1.5">
                  {canResend && (
                    <button type="button" onClick={() => void action(row.id, 'resend')} className="btn-ghost px-2.5 py-1 text-xs">
                      Resend
                    </button>
                  )}
                  {canRevoke && (
                    <button
                      type="button"
                      onClick={() => void action(row.id, 'revoke')}
                      className="btn-ghost px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            ← Prev
          </button>
          <span className="text-xs text-slate-400">
            Page {page + 1} of {totalPages}
          </span>
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next →
          </button>
        </div>
      )}
    </section>
  );
}

