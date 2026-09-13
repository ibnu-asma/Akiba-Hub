import type { DivisionsData, MatrixCell, UpsolvingMatrix } from './types';

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export function MatrixView({
  problems,
  students,
}: {
  problems: { id: string; name: string; difficulty: string }[];
  students: { userId: string; name: string; cells: Record<string, MatrixCell> }[];
}) {
  return (
    <section className="card overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-4 py-3 font-semibold">Student</th>
            {problems.map((p) => (
              <th key={p.id} className="px-3 py-3 font-semibold" title={p.name}>
                <span className="line-clamp-1 max-w-[120px]">{p.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {students.map((s) => (
            <tr key={s.userId}>
              <td className="px-4 py-2.5 font-semibold text-slate-800">{s.name}</td>
              {problems.map((p) => {
                const cell = s.cells[p.id];
                return (
                  <td key={p.id} className={`px-3 py-2.5 ${cell ? 'bg-a2sv-50 text-a2sv-800' : 'text-slate-300'}`}>
                    {cell ? `${cell.attempts} | ${cell.minutes}m` : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function UpsolvingView({ upsolving }: { upsolving: UpsolvingMatrix }) {
  return (
    <div className="space-y-6">
      {upsolving.contests.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No contests yet.</p>}
      {upsolving.contests.map((contest) => (
        <section key={contest.id} className="card overflow-hidden">
          <h3 className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-900">{contest.name}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Student</th>
                  {contest.problems.map((p) => (
                    <th key={p.problemId} className="px-3 py-2.5 font-semibold">
                      {p.pseudo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {upsolving.students.map((s) => (
                  <tr key={s.userId}>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{s.name}</td>
                    {contest.problems.map((p) => {
                      const cell = s.cells[p.problemId];
                      return (
                        <td key={p.problemId} className={`px-3 py-2.5 ${cell ? 'bg-a2sv-50 text-a2sv-800' : 'text-slate-300'}`}>
                          {cell ? `${cell.attempts} | ${cell.minutes}m` : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

export function DivisionsView({ divisions }: { divisions: DivisionsData }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {divisions.divisions.map((d) => (
        <section key={d.name} className="card p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">{d.name}</h3>
            <span className="chip bg-a2sv-50 text-a2sv-700">
              {d.minRating}–{d.maxRating}
            </span>
          </div>
          <ul className="mt-3 divide-y divide-slate-100">
            {d.students.length === 0 && <li className="py-3 text-sm text-slate-400">No students.</li>}
            {d.students.map((s) => (
              <li key={s.userId} className="flex items-center justify-between py-2.5">
                <span className="truncate text-sm font-medium text-slate-800">{s.name}</span>
                <span className="text-sm font-bold text-slate-900">{s.rating}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {divisions.unassigned.length > 0 && (
        <section className="card p-5">
          <h3 className="text-sm font-bold text-slate-900">Unassigned</h3>
          <ul className="mt-3 divide-y divide-slate-100">
            {divisions.unassigned.map((s) => (
              <li key={s.userId} className="flex items-center justify-between py-2.5">
                <span className="truncate text-sm font-medium text-slate-800">{s.name}</span>
                <span className="text-sm font-bold text-slate-900">{s.rating}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
