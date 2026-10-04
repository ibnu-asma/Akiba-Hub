'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icon';
import type { Solver } from '@/lib/student';

const DIFF: Record<string, string> = {
  easy: 'bg-emerald-50 text-emerald-700',
  medium: 'bg-amber-50 text-amber-700',
  hard: 'bg-rose-50 text-rose-700',
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function PlatformIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  if (p === 'leetcode') {
    return (
      <svg className="h-3.5 w-3.5 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.247 2.198 5.864 2.189 8.098-.02l3.708-3.666a1.375 1.375 0 1 0-1.94-1.948l-3.707 3.666c-1.16 1.147-3.044 1.152-4.21-.019l-4.275-4.192a3.176 3.176 0 0 1-.682-.973 3.328 3.328 0 0 1-.194-.578 3.376 3.376 0 0 1-.038-1.438 3.09 3.09 0 0 1 .712-1.237L9.08 7.643l5.362-5.75A1.376 1.376 0 0 0 13.483 0zm-2.88 7.218a1.375 1.375 0 0 0-1.229.76l-1.78 3.56a1.375 1.375 0 1 0 2.457 1.23l1.78-3.56a1.375 1.375 0 0 0-1.228-1.99z" />
        <path d="M9.833 15.321l2.188 3.282a1.375 1.375 0 0 0 2.29-1.526l-2.188-3.282a1.375 1.375 0 0 0-2.29 1.526z" />
      </svg>
    );
  }
  if (p === 'codeforces') {
    return (
      <svg className="h-3.5 w-3.5 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M4.5 7.5a1.5 1.5 0 0 1 1.5 1.5v10.5a1.5 1.5 0 0 1-3 0V9a1.5 1.5 0 0 1 1.5-1.5zM12 3a1.5 1.5 0 0 1 1.5 1.5v15a1.5 1.5 0 0 1-3 0v-15A1.5 1.5 0 0 1 12 3zm7.5 7.5a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-3 0v-6a1.5 1.5 0 0 1 1.5-1.5z" />
      </svg>
    );
  }
  return <Icon name="code" className="h-3.5 w-3.5 text-slate-500 shrink-0" />;
}

export interface SolveableProblem {
  id: string;
  name: string;
  difficulty: string;
  platform: string;
  tags: string[];
  link: string;
  createdAt?: string;
}

/**
 * Student problem card — matched to Track Detail design (greenish solved background,
 * ✓ Solved badge, soft difficulty badge, platform pill with icon, + New Solution link,
 * bookmark toggle, and clickable solver avatars linking to user profiles).
 */
export function ProblemSolveCard({
  problem,
  solved,
  letter,
  trackLabel,
  solvers = [],
  myId,
  isBookmarked: externalBookmarked,
  onToggleBookmark: externalToggleBookmark,
  isHead,
  onRemove,
}: {
  problem: SolveableProblem;
  solved: boolean;
  letter?: string;
  trackLabel?: string;
  solvers?: Solver[];
  myId?: string;
  isBookmarked?: boolean;
  onToggleBookmark?: (problemId: string) => void;
  isHead?: boolean;
  onRemove?: () => void;
}) {
  const [internalBookmarked, setInternalBookmarked] = useState(false);

  // Sync internal bookmark state if not managed by parent
  useEffect(() => {
    if (externalBookmarked !== undefined) return;
    try {
      const raw = localStorage.getItem('hub_bookmarked_problems');
      if (raw) {
        const set = new Set<string>(JSON.parse(raw));
        setInternalBookmarked(set.has(problem.id));
      }
    } catch {}
  }, [problem.id, externalBookmarked]);

  const isBookmarked = externalBookmarked ?? internalBookmarked;

  const handleToggleBookmark = () => {
    if (externalToggleBookmark) {
      externalToggleBookmark(problem.id);
      return;
    }
    try {
      const raw = localStorage.getItem('hub_bookmarked_problems');
      const set = raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
      if (set.has(problem.id)) {
        set.delete(problem.id);
        setInternalBookmarked(false);
      } else {
        set.add(problem.id);
        setInternalBookmarked(true);
      }
      localStorage.setItem('hub_bookmarked_problems', JSON.stringify([...set]));
    } catch {
      setInternalBookmarked((prev) => !prev);
    }
  };

  const diffClass = DIFF[problem.difficulty.toLowerCase()] ?? DIFF.easy;
  const isEffectiveSolved = solved || (Boolean(isHead) && solvers.length > 0);

  return (
    <article
      className={`rounded-xl transition-all p-4 flex flex-col justify-between shadow-xs hover:shadow-md ${
        isEffectiveSolved
          ? 'bg-[#f0fdf4] border-2 border-[#86efac]/90'
          : 'bg-white border border-slate-200/80'
      }`}
    >
      <div>
        {/* Top Row: Pseudo Letter / Difficulty badge + Solved badge + Name + Actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
            {letter && (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                {letter}
              </span>
            )}
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0 capitalize ${diffClass}`}>
              {problem.difficulty}
            </span>
            {isEffectiveSolved && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-100/90 rounded-md shrink-0">
                <Icon name="check" className="h-3 w-3" />
                Solved
              </span>
            )}
            <a
              href={problem.link}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-bold text-slate-800 hover:text-emerald-600 transition truncate"
              title={problem.name}
            >
              {problem.name}
            </a>
          </div>

          {/* Top-Right Actions: + New Solution, External Link, Bookmark */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/problems/${problem.id}/submission`}
              className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition"
            >
              <span className="text-sm leading-none">+</span> New Solution
            </Link>
            <a
              href={problem.link}
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-slate-700 p-0.5 transition"
              aria-label={`Open ${problem.name}`}
            >
              <Icon name="externalLink" className="h-3.5 w-3.5" />
            </a>
            {isHead && (
              <a
                href={`/problems/${problem.id}/edit`}
                className="text-slate-400 hover:text-a2sv-600 p-0.5 transition ml-1"
                aria-label={`Edit ${problem.name}`}
              >
                <Icon name="clipboard" className="h-3.5 w-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={handleToggleBookmark}
              className={`p-0.5 transition cursor-pointer ${
                isBookmarked ? 'text-amber-500 fill-amber-500' : 'text-slate-400 hover:text-slate-700'
              }`}
              aria-label="Bookmark problem"
            >
              <Icon name="bookmark" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {trackLabel && (
          <p className="mt-1 text-xs text-slate-400 font-medium">{trackLabel}</p>
        )}

        {/* Middle: Tags + Platform Badge */}
        <div className="mt-2.5 space-y-2">
          {problem.tags && problem.tags.length > 0 && (
            <div>
              <span className="inline-block px-2.5 py-0.5 text-[11px] font-medium text-slate-600 bg-slate-100 rounded-md">
                {problem.tags.join(', ')}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200/80 rounded-full w-fit">
            <PlatformIcon platform={problem.platform} />
            <span className="capitalize">{problem.platform}</span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Solver Count + Clickable Avatar Stack */}
      <div className="mt-4 flex items-center justify-end gap-1.5 border-t border-slate-100 pt-2.5 min-h-[32px]">
        {solvers.length > 0 && (
          <>
            <span className="text-xs font-semibold text-slate-400 mr-1.5">{solvers.length}</span>
            <div className="flex items-center -space-x-1.5">
              {solvers.slice(0, 8).map((solver) => {
                const sProfileHref = solver.userId === myId ? '/profile' : `/profile?userId=${solver.userId}`;
                return (
                  <Link
                    key={solver.userId}
                    href={sProfileHref}
                    title={`${solver.name} (view profile)`}
                    className="transition-transform hover:scale-110 hover:z-10"
                  >
                    <span className="grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-slate-600 text-[10px] font-semibold text-white ring-2 ring-white hover:ring-emerald-400 transition">
                      {solver.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={solver.avatarUrl} alt={solver.name} className="h-full w-full object-cover" />
                      ) : (
                        initials(solver.name)
                      )}
                    </span>
                  </Link>
                );
              })}
              {solvers.length > 8 && (
                <span className="ml-1 text-[10px] font-medium text-slate-400">
                  +{solvers.length - 8}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </article>
  );
}

/** Thin rounded progress bar with a label. */
export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="font-semibold text-slate-700">
          {value}/{max} · {pct}%
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full transition-all ${pct >= 100 ? 'bg-a2sv-500' : pct >= 50 ? 'bg-a2sv-400' : 'bg-amber-400'}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}

