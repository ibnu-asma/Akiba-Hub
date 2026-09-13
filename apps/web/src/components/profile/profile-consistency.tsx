'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/icon';

interface DaySolve {
  day: string; // 'YYYY-MM-DD'
  count: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

function getIntensityClass(count: number): string {
  if (count === 0) return 'bg-slate-100 hover:bg-slate-200';
  if (count === 1) return 'bg-emerald-300 hover:bg-emerald-400';
  if (count <= 3) return 'bg-emerald-500 hover:bg-emerald-600';
  if (count <= 5) return 'bg-emerald-700 hover:bg-emerald-800';
  return 'bg-emerald-900 hover:bg-emerald-950';
}

function getCardBackgroundClass(count: number): { bg: string; footerBg: string } {
  if (count === 1) return { bg: 'bg-emerald-500 text-white', footerBg: 'bg-emerald-600/30 text-emerald-950' };
  if (count <= 3) return { bg: 'bg-emerald-600 text-white', footerBg: 'bg-emerald-700/40 text-emerald-100' };
  if (count <= 5) return { bg: 'bg-emerald-700 text-white', footerBg: 'bg-emerald-800/50 text-emerald-100' };
  return { bg: 'bg-emerald-800 text-white ring-2 ring-amber-400', footerBg: 'bg-emerald-900/60 text-amber-200' };
}

export function ProfileConsistency({
  solves,
  availableYears = [2026, 2025, 2024],
}: {
  solves: DaySolve[];
  availableYears?: number[];
}) {
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    return availableYears[0] ?? new Date().getFullYear();
  });
  // Collapsed by default: shows the 52-week calendar heatmap (consistency style).
  // When expanded: opens into the dense date-cell cards (attendance style).
  const [expanded, setExpanded] = useState(false);
  const [showDetail, setShowDetail] = useState(true);

  // Map of date string -> solve count
  const solveMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of solves) {
      map.set(s.day, (map.get(s.day) ?? 0) + s.count);
    }
    return map;
  }, [solves]);

  // Generate 52-53 weeks of days for the selected year
  const { weeks, monthHeaders, totalYearSolves, activeDays, activeDaysList } = useMemo(() => {
    const start = new Date(selectedYear, 0, 1);
    const end = new Date(selectedYear, 11, 31);
    let totalYearSolves = 0;
    let activeDays = 0;
    const activeDaysList: { date: Date; dateStr: string; count: number }[] = [];

    // Align start to the nearest Sunday
    const startOffset = start.getDay();
    const curr = new Date(start);
    curr.setDate(curr.getDate() - startOffset);

    const weeksList: { date: Date; dateStr: string; count: number; inYear: boolean }[][] = [];
    const monthOffsets: { month: string; colIndex: number }[] = [];
    let lastMonth = -1;
    let col = 0;

    while (curr <= end || curr.getDay() !== 0) {
      const week: { date: Date; dateStr: string; count: number; inYear: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const dateCopy = new Date(curr);
        const y = dateCopy.getFullYear();
        const m = String(dateCopy.getMonth() + 1).padStart(2, '0');
        const day = String(dateCopy.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${day}`;
        const inYear = y === selectedYear;
        const count = inYear ? (solveMap.get(dateStr) ?? 0) : 0;

        if (inYear && count > 0) {
          totalYearSolves += count;
          activeDays += 1;
          activeDaysList.push({ date: dateCopy, dateStr, count });
        }

        if (inYear && dateCopy.getMonth() !== lastMonth && d === 0) {
          lastMonth = dateCopy.getMonth();
          monthOffsets.push({ month: MONTHS[lastMonth] ?? '', colIndex: col });
        }

        week.push({ date: dateCopy, dateStr, count, inYear });
        curr.setDate(curr.getDate() + 1);
      }
      weeksList.push(week);
      col++;
    }

    return {
      weeks: weeksList,
      monthHeaders: monthOffsets,
      totalYearSolves,
      activeDays,
      activeDaysList,
    };
  }, [selectedYear, solveMap]);

  // Monthly breakdown for expanded view
  const monthlySolves = useMemo(() => {
    const list = MONTHS.map((m, idx) => ({ month: m, count: 0, days: 0 }));
    for (const d of activeDaysList) {
      const m = d.date.getMonth();
      if (list[m]) {
        list[m].count += d.count;
        list[m].days += 1;
      }
    }
    const maxSolves = Math.max(1, ...list.map((l) => l.count));
    return list.map((l) => ({
      ...l,
      percent: Math.round((l.count / maxSolves) * 100),
    }));
  }, [activeDaysList]);

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <section className="card p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title={expanded ? 'Switch to Heatmap' : 'Switch to Detailed View'}
          >
            <Icon
              name={expanded ? 'chevronDown' : 'chevronRight'}
              className="h-4 w-4"
            />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 leading-none">Consistency</h2>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                {expanded ? 'Detailed Cards' : 'Heatmap'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {totalYearSolves} solves across {activeDays} active days in {selectedYear}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Year Filter Dropdown */}
          <div className="relative inline-flex items-center">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              aria-label="Filter by year"
              className="appearance-none rounded-xl border border-slate-200 bg-slate-50/80 py-1.5 pl-3 pr-8 text-xs font-bold text-slate-700 hover:bg-slate-100 focus:border-a2sv-500 focus:outline-none cursor-pointer transition shadow-2xs"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 text-slate-400">
              <Icon name="chevronDown" className="h-3.5 w-3.5" />
            </span>
          </div>

          {/* Show Detail switch (only when expanded into attendance style) */}
          {expanded && (
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
              <span>Show detail</span>
              <div
                onClick={() => setShowDetail(!showDetail)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showDetail ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    showDetail ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </label>
          )}

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-semibold text-a2sv-600 hover:text-a2sv-700 transition cursor-pointer"
          >
            {expanded ? 'Collapse to Heatmap' : 'Expand to Details'}
          </button>
        </div>
      </div>

      {!expanded ? (
        /* COLLAPSED VIEW: 52-Week Calendar Heatmap (Consistency Style) */
        <div className="mt-4 pt-1">
          <div className="overflow-x-auto pb-2">
            <div className="min-w-[720px]">
              {/* Month Headers */}
              <div className="flex ml-7 mb-1 text-[11px] font-medium text-slate-400 h-4">
                {monthHeaders.map((mh, i) => (
                  <span
                    key={`${mh.month}-${i}`}
                    style={{ marginLeft: i === 0 ? `${mh.colIndex * 13}px` : undefined }}
                    className="truncate mr-4"
                  >
                    {mh.month}
                  </span>
                ))}
              </div>

              {/* Day Labels + 7x52 Grid */}
              <div className="flex gap-1">
                {/* Weekday labels */}
                <div className="flex flex-col gap-1 pr-1 text-[10px] font-semibold text-slate-400 select-none">
                  {DAY_LABELS.map((lbl, idx) => (
                    <span key={idx} className="h-2.5 leading-2.5">
                      {lbl}
                    </span>
                  ))}
                </div>

                {/* Weeks columns */}
                <div className="flex gap-1 flex-1">
                  {weeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-1">
                      {week.map((cell) => {
                        const isToday = cell.dateStr === todayStr;
                        const hasStreakHighlight = cell.count >= 4;

                        return (
                          <div
                            key={cell.dateStr}
                            title={`${cell.dateStr}: ${cell.count} ${cell.count === 1 ? 'solve' : 'solves'}`}
                            className={`h-2.5 w-2.5 rounded-[2px] transition-all cursor-pointer relative ${
                              !cell.inYear
                                ? 'opacity-0 pointer-events-none'
                                : getIntensityClass(cell.count)
                            } ${
                              hasStreakHighlight
                                ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-white'
                                : isToday
                                  ? 'ring-1.5 ring-emerald-600'
                                  : ''
                            }`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend & Stats Footer */}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-50">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px]">Less</span>
                  <span className="h-2.5 w-2.5 rounded-[2px] bg-slate-100" />
                  <span className="h-2.5 w-2.5 rounded-[2px] bg-emerald-300" />
                  <span className="h-2.5 w-2.5 rounded-[2px] bg-emerald-500" />
                  <span className="h-2.5 w-2.5 rounded-[2px] bg-emerald-700" />
                  <span className="h-2.5 w-2.5 rounded-[2px] bg-emerald-900" />
                  <span className="text-[11px]">More</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full ring-2 ring-amber-400" />
                    High Activity Streak (4+ solves)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* EXPANDED VIEW: Attendance Style (Dense Date-Cell Cards or Monthly Summary) */
        <div className="mt-4">
          {/* Summary Metric Pills */}
          <div className="flex items-center gap-2.5 flex-wrap mb-4 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 border border-emerald-200/60">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {totalYearSolves} Total Solves
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-slate-700 border border-slate-200">
              {activeDays} Active Days
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-amber-800 border border-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Year {selectedYear}
            </span>
          </div>

          {showDetail ? (
            /* Dense colored date-cell cards matching attendance style */
            activeDaysList.length === 0 ? (
              <div className="py-8 text-center bg-slate-50/60 rounded-2xl border border-slate-100">
                <p className="text-xs font-medium text-slate-400">
                  No solve activity recorded for {selectedYear}.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto pb-2">
                <div className="flex flex-wrap gap-1.5 max-h-[460px] overflow-y-auto p-1">
                  {activeDaysList.map((item) => {
                    const dayNum = String(item.date.getDate()).padStart(2, '0');
                    const monthStr = MONTHS[item.date.getMonth()] ?? '';
                    const yearShort = String(item.date.getFullYear()).slice(2);
                    const { bg, footerBg } = getCardBackgroundClass(item.count);

                    return (
                      <div
                        key={item.dateStr}
                        title={`${item.dateStr}: ${item.count} ${item.count === 1 ? 'solve' : 'solves'}`}
                        className={`group relative flex flex-col justify-between w-[52px] h-[52px] rounded-lg shadow-2xs overflow-hidden transition hover:scale-105 cursor-pointer ${bg}`}
                      >
                        {/* Top: Day number + Month/Year badge */}
                        <div className="flex items-start justify-between px-1 pt-1 leading-none">
                          <span className="text-sm font-extrabold tracking-tight">
                            {dayNum}
                          </span>
                          <div className="flex flex-col items-end text-[8px] font-bold uppercase opacity-90 leading-tight">
                            <span>{monthStr}</span>
                            <span className="text-[7px]">{yearShort}</span>
                          </div>
                        </div>

                        {/* Bottom: Solve count */}
                        <div className={`px-1 py-0.5 text-[8.5px] font-semibold text-center truncate ${footerBg}`}>
                          {item.count} {item.count === 1 ? 'solve' : 'solves'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ) : (
            /* Monthly summary breakdown cards */
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {monthlySolves.map((mb) => (
                <div
                  key={mb.month}
                  className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">{mb.month}</span>
                    <span className="text-xs font-extrabold text-emerald-700">{mb.count} solves</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${mb.percent}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    {mb.days} active practice days
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
