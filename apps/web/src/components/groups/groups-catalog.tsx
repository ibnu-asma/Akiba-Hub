'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icon';
import { GroupCard } from './group-card';
import type { Group, SuperGroup, Me } from '@/lib/api';
import { ROLE_LEVEL, type Role } from '@hub/shared';

const ALL = '__all__';

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'students_desc', label: 'Most Students' },
  { value: 'students_asc', label: 'Fewest Students' },
];

const PAGE_SIZES = [
  { value: '6', label: '6 per page' },
  { value: '12', label: '12 per page' },
  { value: '24', label: '24 per page' },
  { value: 'all', label: 'All groups' },
];

export function GroupsCatalog({
  groups,
  superGroups,
  me,
}: {
  groups: Group[];
  superGroups: SuperGroup[];
  me: Me;
}) {
  const [q, setQ] = useState('');
  const [superGroupId, setSuperGroupId] = useState(ALL);
  const [country, setCountry] = useState(ALL);
  const [sort, setSort] = useState('name_asc');

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState('12');

  const isHoA = (ROLE_LEVEL[me.role as Role] ?? 1) >= 3;

  // SuperGroup options
  const superGroupOptions = useMemo(() => {
    const list = superGroups.map((sg) => ({ value: sg.id, label: sg.name }));
    // Also include any superGroupName from groups that might not be in superGroups array
    const extra = new Set<string>();
    for (const g of groups) {
      if (g.superGroupId && !list.some((s) => s.value === g.superGroupId)) {
        extra.add(JSON.stringify({ value: g.superGroupId, label: g.superGroupName ?? 'Program' }));
      }
    }
    const combined = [...list, ...Array.from(extra).map((s) => JSON.parse(s))];
    return [{ value: ALL, label: 'All Super Groups' }, ...combined];
  }, [groups, superGroups]);

  // Country options
  const countryOptions = useMemo(() => {
    const countries = new Set<string>();
    for (const g of groups) {
      if (g.country) countries.add(g.country);
    }
    return [
      { value: ALL, label: 'All Countries' },
      ...Array.from(countries).sort().map((c) => ({ value: c, label: c })),
    ];
  }, [groups]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [q, superGroupId, country, sort, pageSize]);

  // Filter and sort groups
  const filteredGroups = useMemo(() => {
    const query = q.trim().toLowerCase();

    return groups
      .filter((g) => {
        // Search query
        if (query) {
          const matchName = g.name.toLowerCase().includes(query);
          const matchShort = g.shortName.toLowerCase().includes(query);
          const matchSuper = g.superGroupName?.toLowerCase().includes(query);
          const matchCountry = g.country?.toLowerCase().includes(query);
          const matchHeads = g.heads.some((h) => h.name.toLowerCase().includes(query));
          const matchStudents = g.students.some((s) => s.name.toLowerCase().includes(query));

          if (!matchName && !matchShort && !matchSuper && !matchCountry && !matchHeads && !matchStudents) {
            return false;
          }
        }

        // SuperGroup filter
        if (superGroupId !== ALL) {
          if (g.superGroupId !== superGroupId) return false;
        }

        // Country filter
        if (country !== ALL) {
          if (g.country !== country) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sort === 'name_asc') return a.name.localeCompare(b.name);
        if (sort === 'name_desc') return b.name.localeCompare(a.name);
        if (sort === 'students_desc') return b.studentCount - a.studentCount || a.name.localeCompare(b.name);
        if (sort === 'students_asc') return a.studentCount - b.studentCount || a.name.localeCompare(b.name);
        return 0;
      });
  }, [groups, q, superGroupId, country, sort]);

  // Pagination calculations
  const totalCount = filteredGroups.length;
  const sizeNum = pageSize === 'all' ? totalCount : Number.parseInt(pageSize, 10);
  const totalPages = sizeNum > 0 ? Math.ceil(totalCount / sizeNum) : 1;
  const safePage = Math.min(page, Math.max(0, totalPages - 1));

  const pagedGroups = useMemo(() => {
    if (pageSize === 'all') return filteredGroups;
    const start = safePage * sizeNum;
    return filteredGroups.slice(start, start + sizeNum);
  }, [filteredGroups, safePage, sizeNum, pageSize]);

  const totalStudents = groups.reduce((acc, g) => acc + g.studentCount, 0);
  const uniqueSuperGroups = new Set(groups.map((g) => g.superGroupId).filter(Boolean)).size;

  const hasActiveFilters = q.trim() !== '' || superGroupId !== ALL || country !== ALL;
  const resetFilters = () => {
    setQ('');
    setSuperGroupId(ALL);
    setCountry(ALL);
    setSort('name_asc');
  };

  const startItem = totalCount === 0 ? 0 : safePage * sizeNum + 1;
  const endItem = pageSize === 'all' ? totalCount : Math.min((safePage + 1) * sizeNum, totalCount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Groups &amp; Users</h1>
          <p className="mt-1 text-sm text-slate-500">
            Explore cohorts across programs, browse rosters, and track detailed group progress.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="chip bg-slate-100 text-slate-700 text-xs font-semibold">
            {groups.length} groups
          </span>
          <span className="chip bg-emerald-50 text-emerald-800 text-xs font-semibold">
            {uniqueSuperGroups} super group{uniqueSuperGroups === 1 ? '' : 's'}
          </span>
          <span className="chip bg-blue-50 text-blue-800 text-xs font-semibold">
            {totalStudents} students
          </span>

          {isHoA && (
            <Link
              href="/groups/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              <span>Add Group</span>
            </Link>
          )}
        </div>
      </header>

      {/* Modernized Search & Filtering Toolbar (Problem Board Style) */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-4 md:p-5 shadow-xs space-y-3.5">
        {/* Search Row */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Icon name="search" className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search groups by name, heads, country, or student names…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-10 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          />
          {q.trim() && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              aria-label="Clear search"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {/* Super Group Filter */}
          <div className="min-w-[170px] flex-1 sm:flex-initial">
            <select
              value={superGroupId}
              onChange={(e) => setSuperGroupId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 cursor-pointer"
            >
              {superGroupOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Country Filter */}
          <div className="min-w-[140px] flex-1 sm:flex-initial">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 cursor-pointer"
            >
              {countryOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Filter */}
          <div className="min-w-[150px] flex-1 sm:flex-initial">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 cursor-pointer"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              <Icon name="x" className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </section>

      {/* Pagination Bar & Results Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 px-1">
        <p>
          Showing <span className="font-semibold text-slate-800">{startItem}</span>–
          <span className="font-semibold text-slate-800">{endItem}</span> of{' '}
          <span className="font-semibold text-slate-800">{totalCount}</span> group{totalCount === 1 ? '' : 's'}
        </p>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              {PAGE_SIZES.map((sz) => (
                <option key={sz.value} value={sz.value}>
                  {sz.label}
                </option>
              ))}
            </select>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                aria-label="Previous page"
              >
                <Icon name="chevronRight" className="h-4 w-4 rotate-180" />
              </button>

              <span className="px-2 font-medium">
                {safePage + 1} / {totalPages}
              </span>

              <button
                type="button"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                aria-label="Next page"
              >
                <Icon name="chevronRight" className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid of Group Cards */}
      {pagedGroups.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-xs">
          <p className="text-4xl">👥</p>
          <h3 className="mt-3 text-base font-bold text-slate-800">No groups found</h3>
          <p className="mt-1 text-sm text-slate-500">
            {hasActiveFilters ? 'Try adjusting your search query or super group filter.' : 'No groups have been created yet.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pagedGroups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}

