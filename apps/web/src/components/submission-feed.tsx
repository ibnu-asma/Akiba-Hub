import type { SubmissionDto } from '@/lib/api';
import { timeAgo } from '@/lib/format';

/** Latest Submissions feed (SPEC §7.13) — newest-first, student · problem · time. */
export function SubmissionFeed({ submissions }: { submissions: SubmissionDto[] }) {
  if (submissions.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">No submissions yet.</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {submissions.map((s) => (
        <li key={s.id} className="flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{s.userName ?? 'Student'}</p>
            <p className="truncate text-xs text-slate-500">{s.problemName ?? 'Problem'}</p>
          </div>
          <span className="chip bg-slate-100 text-slate-500">{s.language}</span>
          <span className="chip bg-a2sv-50 text-a2sv-700">{s.tries} trie{s.tries === 1 ? '' : 's'}</span>
          <span className="w-16 text-right text-xs text-slate-400">{timeAgo(s.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}
