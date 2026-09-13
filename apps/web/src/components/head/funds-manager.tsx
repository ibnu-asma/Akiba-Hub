'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OutlinedInput } from '@/components/form/field';
import { SelectUser, type SelectUserOption } from '@/components/form/select-user';
import type { FundWithRollupDto, StipendDto } from '@/lib/api';

const money = (amount: number, currency: string) =>
  `${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currency}`;

/** HoE/HoA: Stipend & Funds manager (SPEC §7.8) — funds left, stipends right. */
export function FundsManager({
  initialFunds,
  students,
}: {
  initialFunds: FundWithRollupDto[];
  students: SelectUserOption[];
}) {
  const router = useRouter();
  const [funds, setFunds] = useState(initialFunds);
  const [selectedId, setSelectedId] = useState<string | null>(initialFunds[0]?.id ?? null);
  const [stipends, setStipends] = useState<StipendDto[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  // new-fund form
  const [showFundForm, setShowFundForm] = useState(false);
  const [fundName, setFundName] = useState('');
  const [fundDesc, setFundDesc] = useState('');
  const [fundAmount, setFundAmount] = useState('');
  const [fundErrors, setFundErrors] = useState<Record<string, string>>({});
  const [fundBusy, setFundBusy] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);

  // assign-stipends form
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [amount, setAmount] = useState('');
  const [userIds, setUserIds] = useState<string[]>([]);
  const [assignErrors, setAssignErrors] = useState<Record<string, string>>({});
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignOk, setAssignOk] = useState<string | null>(null);
  const [showAssignForm, setShowAssignForm] = useState(false);

  const selected = funds.find((fund) => fund.id === selectedId) ?? null;

  const loadStipends = useCallback(async (fundId: string) => {
    setLoadingRows(true);
    try {
      const res = await fetch(`/api/admin/funds/${fundId}/stipends`);
      const rows = (await res.json().catch(() => null)) as StipendDto[] | null;
      setStipends(res.ok && rows ? rows : []);
    } catch {
      setStipends([]);
    } finally {
      setLoadingRows(false);
    }
  }, []);

  /** Re-fetch the fund list so paid/pending roll-ups reflect the server of record. */
  async function refreshFunds() {
    try {
      const res = await fetch('/api/admin/funds');
      const rows = (await res.json().catch(() => null)) as FundWithRollupDto[] | null;
      if (res.ok && rows) setFunds(rows);
    } catch {
      /* keep the current list on network failure */
    }
  }

  function selectFund(id: string) {
    setSelectedId(id);
    setStipends([]);
    setAssignOk(null);
    void loadStipends(id);
  }

  async function createFund(event: React.FormEvent) {
    event.preventDefault();
    setFundError(null);
    const next: Record<string, string> = {};
    if (!fundName.trim()) next.name = 'Fund name is required';
    const amountNum = Number(fundAmount);
    if (!fundAmount.trim() || Number.isNaN(amountNum) || amountNum <= 0) next.amount = 'Enter the budget amount';
    setFundErrors(next);
    if (Object.keys(next).length > 0) return;
    setFundBusy(true);
    try {
      const res = await fetch('/api/admin/funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fundName.trim(), description: fundDesc.trim() || null, amount: amountNum, currency: 'ETB' }),
      });
      const payload = (await res.json().catch(() => null)) as FundWithRollupDto | { error?: { message: string } } | null;
      if (!res.ok) {
        setFundError((payload as { error?: { message: string } })?.error?.message ?? 'Could not create the fund.');
        return;
      }
      const fund = payload as FundWithRollupDto;
      setFunds((prev) => [{ ...fund, paidTotal: 0, pendingTotal: 0 }, ...prev]);
      setFundName('');
      setFundDesc('');
      setFundAmount('');
      setShowFundForm(false);
      selectFund(fund.id);
      router.refresh();
    } catch {
      setFundError('Network error — is the API running?');
    } finally {
      setFundBusy(false);
    }
  }

  async function assign(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setAssignError(null);
    setAssignOk(null);
    const next: Record<string, string> = {};
    if (!/^\d{4}-\d{2}$/.test(month)) next.month = 'Pick the month';
    const amountNum = Number(amount);
    if (!amount.trim() || Number.isNaN(amountNum) || amountNum <= 0) next.amount = 'Enter the monthly amount';
    if (userIds.length === 0) next.userIds = 'Pick at least one student';
    setAssignErrors(next);
    if (Object.keys(next).length > 0) return;
    setAssignBusy(true);
    try {
      const res = await fetch(`/api/admin/funds/${selected.id}/stipends`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, rows: userIds.map((id) => ({ userId: id, amount: amountNum })) }),
      });
      const payload = (await res.json().catch(() => null)) as { assigned?: number; error?: { message: string } } | null;
      if (!res.ok) {
        setAssignError(payload?.error?.message ?? 'Could not assign stipends.');
        return;
      }
      const assigned = payload?.assigned ?? userIds.length;
      setAssignOk(
        `${assigned} stipend${assigned === 1 ? '' : 's'} assigned for ${month} — re-assigning updates amounts instead of duplicating.`,
      );
      setUserIds([]);
      setAmount('');
      await loadStipends(selected.id);
      await refreshFunds();
      router.refresh();
    } catch {
      setAssignError('Network error — is the API running?');
    } finally {
      setAssignBusy(false);
    }
  }

  async function toggleStatus(row: StipendDto) {
    const status = row.status === 'paid' ? 'pending' : 'paid';
    try {
      const res = await fetch(`/api/admin/stipends/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return;
      setStipends((prev) => prev.map((r) => (r.id === row.id ? { ...r, status } : r)));
      void refreshFunds();
      router.refresh();
    } catch {
      /* leave the row as-is on network failure */
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Funds</h2>
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setShowFundForm((v) => !v)}>
            {showFundForm ? 'Close' : '+ New fund'}
          </button>
        </div>

        {showFundForm && (
          <form onSubmit={createFund} className="card space-y-4 p-5">
            <OutlinedInput
              label="Fund name"
              required
              value={fundName}
              onChange={(e) => setFundName(e.target.value)}
              error={fundErrors.name}
              placeholder="e.g. October stipends"
            />
            <OutlinedInput label="Description" value={fundDesc} onChange={(e) => setFundDesc(e.target.value)} placeholder="Optional" />
            <OutlinedInput
              label="Budget amount (ETB)"
              type="number"
              min="1"
              step="0.01"
              required
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              error={fundErrors.amount}
              placeholder="0.00"
            />
            {fundError && <p className="field-error">{fundError}</p>}
            <button type="submit" className="btn-primary w-full" disabled={fundBusy}>
              {fundBusy ? 'Creating…' : 'Create fund'}
            </button>
          </form>
        )}

        {funds.length === 0 && !showFundForm && (
          <div className="card p-8 text-center">
            <span aria-hidden="true" className="text-3xl">
              💰
            </span>
            <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-slate-300">No funds yet</p>
          </div>
        )}

        <ul className="space-y-3">
          {funds.map((fund) => (
            <li key={fund.id}>
              <button
                type="button"
                onClick={() => selectFund(fund.id)}
                className={`card w-full p-4 text-left transition ${
                  fund.id === selectedId ? 'border-a2sv-400 ring-2 ring-a2sv-100' : 'hover:border-a2sv-300'
                }`}
              >
                <p className="truncate text-sm font-semibold text-slate-900">{fund.name}</p>
                {fund.description && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{fund.description}</p>}
                <p className="mt-2 text-lg font-bold tracking-tight text-slate-900">{money(Number(fund.amount), fund.currency)}</p>
                <p className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="chip bg-a2sv-50 text-a2sv-700">paid {money(Number(fund.paidTotal), fund.currency)}</span>
                  <span className="chip bg-amber-50 text-amber-700">pending {money(Number(fund.pendingTotal), fund.currency)}</span>
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* RIGHT */}
      <div className="space-y-4 lg:col-span-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Stipends{selected ? ` — ${selected.name}` : ''}</h2>
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setShowAssignForm((v) => !v)}>
            {showAssignForm ? 'Close' : '+ Assign stipends'}
          </button>
        </div>

        {showAssignForm && (
          <form onSubmit={assign} className="card space-y-4 p-5">
            <OutlinedInput
              label="Month"
              type="month"
              required
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              error={assignErrors.month}
              placeholder="2024-10"
            />
            <OutlinedInput
              label="Monthly amount (ETB)"
              type="number"
              min="1"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={assignErrors.amount}
              placeholder="0.00"
            />
            <SelectUser
              label="Students"
              options={students}
              value={userIds}
              onChange={setUserIds}
              error={assignErrors.userIds}
              multiple
            />
            {assignError && <p className="field-error">{assignError}</p>}
            {assignOk && <p className="field-ok">{assignOk}</p>}
            <button type="submit" className="btn-primary w-full" disabled={assignBusy}>
              {assignBusy ? 'Assigning…' : 'Assign stipends'}
            </button>
          </form>
        )}

        {loadingRows && <p className="text-xs text-slate-400">Loading stipends…</p>}

        {!loadingRows && stipends.length === 0 && (
          <div className="card p-8 text-center">
            <span aria-hidden="true" className="text-3xl">
              🧾
            </span>
            <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-slate-300">
              No stipends yet — assign the first one
            </p>
          </div>
        )}

        {!loadingRows && stipends.length > 0 && (
          <ul className="space-y-3">
            {stipends.map((row) => (
              <li key={row.id} className="card flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{row.userName ?? 'Student'}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {row.month} · {money(Number(row.amount), selected?.currency ?? 'ETB')}
                  </p>
                </div>
                <span
                  className={`chip ${
                    row.status === 'paid' ? 'bg-a2sv-50 text-a2sv-700' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {row.status}
                </span>
                <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => void toggleStatus(row)}>
                  {row.status === 'paid' ? 'Revert to pending' : 'Mark paid'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

