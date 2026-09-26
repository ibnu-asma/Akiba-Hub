'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/icon';

const DIFF_BADGE: Record<string, string> = {
  easy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  hard: 'bg-rose-50 text-rose-700 border-rose-200',
};

export interface SelectProblemOption {
  id: string;
  name: string;
  platform: string;
  difficulty: string;
  tags: string[];
}

export function SelectProblems({
  options,
  value,
  onChange,
  placeholder = 'Search problems…',
  error,
}: {
  options: SelectProblemOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const lower = query.toLowerCase();
    return options.filter(
      (o) =>
        o.name.toLowerCase().includes(lower) ||
        o.platform.toLowerCase().includes(lower) ||
        o.difficulty.toLowerCase().includes(lower)
    );
  }, [options, query]);

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  }

  const selectedOptions = options.filter((o) => value.includes(o.id));

  return (
    <div className="relative" ref={wrapperRef}>
      <div
        className={`relative flex min-h-[46px] w-full flex-wrap items-center gap-2 rounded-xl border bg-white px-3 py-2 transition-shadow hover:shadow-xs focus-within:border-a2sv-500 focus-within:ring-2 focus-within:ring-a2sv-100 ${
          error ? 'border-red-300' : 'border-slate-300'
        }`}
        onClick={() => setOpen(true)}
      >
        {selectedOptions.length === 0 && !query && (
          <span className="absolute left-3.5 text-slate-400 pointer-events-none">{placeholder}</span>
        )}
        
        {selectedOptions.map((opt) => (
          <span
            key={opt.id}
            className="flex items-center gap-1.5 rounded-lg bg-a2sv-50 border border-a2sv-100 py-1 pl-2.5 pr-1 text-xs font-semibold text-a2sv-800 shadow-2xs"
            onClick={(e) => e.stopPropagation()}
          >
            {opt.name}
            <button
              type="button"
              className="rounded-md p-0.5 text-a2sv-500 hover:bg-a2sv-200 hover:text-a2sv-900 transition"
              onClick={() => toggle(opt.id)}
            >
              <Icon name="x" className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        
        <input
          type="text"
          className="flex-1 min-w-[120px] bg-transparent text-slate-900 placeholder-transparent outline-none border-none ring-0 p-0"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={selectedOptions.length === 0 ? placeholder : ''}
        />
        
        <div className="absolute right-3 flex items-center text-slate-400">
          <Icon name="search" className="h-4.5 w-4.5" />
        </div>
      </div>

      {open && (
        <div className="absolute z-10 mt-1.5 max-h-[320px] w-full overflow-y-auto rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl ring-1 ring-slate-900/5">
          <ul className="flex flex-col gap-0.5">
            {filtered.length === 0 && (
              <li className="px-3 py-8 text-center text-sm font-semibold text-slate-400">
                <Icon name="code" className="mx-auto h-6 w-6 text-slate-300 mb-2" />
                No problems match "{query}"
              </li>
            )}
            {filtered.map((option) => {
              const active = value.includes(option.id);
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => toggle(option.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                      active ? 'bg-slate-50 ring-1 ring-slate-200' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="block truncate text-sm font-bold text-slate-900">{option.name}</span>
                        {active && <Icon name="checkCircle" className="h-4 w-4 shrink-0 text-a2sv-600" />}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
                        <span className={`inline-flex items-center justify-center rounded-md border px-1.5 py-0.5 shadow-2xs ${DIFF_BADGE[option.difficulty] ?? DIFF_BADGE.medium}`}>
                          {option.difficulty}
                        </span>
                        <span className="text-slate-500 bg-slate-100 border border-slate-200 rounded-md px-1.5 py-0.5">
                          {option.platform}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
