'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/icon';

/*
 * Searchable user picker — the combobox from the HoA "Generate Invite" screen:
 * trigger field (chevron + clear ✕) → search input → scrollable option rows
 * with avatar + name + meta (group · role), light-green hover, check on active.
 * `multiple` renders selected entries as removable green chips (contest form).
 */

export interface SelectUserOption {
  id: string;
  name: string;
  role?: string;
  group?: string | null;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export function SelectUser({
  options,
  value,
  onChange,
  label = 'Select User',
  placeholder = 'Select user…',
  multiple = false,
  error,
  hint,
}: {
  options: SelectUserOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  placeholder?: string;
  multiple?: boolean;
  error?: string | null;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) =>
        option.name.toLowerCase().includes(q) ||
        (option.group ?? '').toLowerCase().includes(q) ||
        (option.role ?? '').toLowerCase().includes(q),
    );
  }, [options, query]);

  const selected = options.filter((option) => value.includes(option.id));

  function toggle(id: string) {
    if (multiple) onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
    else {
      onChange([id]);
      setOpen(false);
    }
  }

  function openPicker() {
    setQuery('');
    setOpen(true);
  }

  return (
    <div ref={rootRef} className="relative">
      <p className="mb-1.5 text-sm font-medium text-slate-700">
        {label}
        {error && <span className="text-red-500"> *</span>}
      </p>

      <div
        role="combobox"
        aria-expanded={open}
        tabIndex={0}
        onClick={() => (open ? setOpen(false) : openPicker())}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (open) setOpen(false);
            else openPicker();
          }
        }}
        className={`flex min-h-[3.25rem] w-full cursor-pointer items-center gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-left text-sm font-medium transition ${
          error ? 'border-red-400' : open ? 'border-a2sv-500 ring-2 ring-a2sv-100' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        {multiple && selected.length > 0 ? (
          <span className="flex flex-wrap gap-1.5">
            {selected.map((option) => (
              <span key={option.id} className="chip bg-a2sv-100 text-a2sv-700">
                {option.name}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(option.id);
                  }}
                  className="ml-1 text-a2sv-600 hover:text-a2sv-800"
                  aria-label={`Remove ${option.name}`}
                >
                  <Icon name="x" className="h-3 w-3" />
                </button>
              </span>
            ))}
          </span>
        ) : (
          <span className={selected.length === 0 ? 'text-slate-400' : 'truncate text-slate-800'}>
            {selected.length === 0 ? placeholder : selected[0]!.name}
          </span>
        )}
        <span className="ml-auto flex items-center gap-2 text-slate-400">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              aria-label="Clear selection"
              className="hover:text-slate-600"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          )}
          <Icon name="chevronDown" className={`h-4.5 w-4.5 transition ${open ? 'rotate-180' : ''}`} />
        </span>
      </div>

      {open && (
        <div className="card absolute z-20 mt-2 w-full overflow-hidden bg-white shadow-xl shadow-slate-200">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name…"
                className="field-input py-2 pl-9"
              />
            </div>
          </div>
          <ul className="max-h-60 overflow-y-auto p-1.5" role="listbox">
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-slate-400">No users match “{query}”</li>
            )}
            {filtered.map((option) => {
              const active = value.includes(option.id);
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => toggle(option.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${
                      active ? 'bg-a2sv-100/70' : 'hover:bg-a2sv-50'
                    }`}
                  >
                    <span className="avatar h-9 w-9 text-[11px]">{initials(option.name)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">{option.name}</span>
                      {(option.role || option.group) && (
                        <span className="block truncate text-xs text-slate-400">
                          {[option.group, option.role].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                    {active && <Icon name="check" className="h-4.5 w-4.5 shrink-0 text-a2sv-600" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {error ? <p className="field-error">{error}</p> : hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}
