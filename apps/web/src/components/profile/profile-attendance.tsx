'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/icon';
import type { UserAttendanceRecord } from '@/lib/api';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

function getEatDateString(isoStr?: string | null): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const eatOffsetMs = 3 * 60 * 60 * 1000;
  const eatDate = new Date(d.getTime() + eatOffsetMs);
  return eatDate.toISOString().slice(0, 10);
}

function formatCheckIn(timeStr?: string | null): string {
  if (timeStr) {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Addis_Ababa',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    }
  }
  return '';
}

function getAttendanceStatusDotClass(status?: string): string {
  if (!status) return 'bg-slate-100 hover:bg-slate-200';
  if (status === 'present') return 'bg-emerald-500 hover:bg-emerald-600';
  if (status === 'late') return 'bg-blue-500 hover:bg-blue-600';
  if (status === 'excused') return 'bg-amber-500 hover:bg-amber-600';
  if (status === 'absent') return 'bg-red-500 hover:bg-red-600';
  return 'bg-slate-100 hover:bg-slate-200';
}

export function ProfileAttendance({
  records,
  availableYears = [2026, 2025, 2024],
}: {
  records: UserAttendanceRecord[];
  availableYears?: number[];
}) {
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    return availableYears[0] ?? new Date().getFullYear();
  });
  // Collapsed by default: shows the 52-week calendar heatmap (consistency style).
  // When expanded: opens into the dense date-cell cards (attendance style).
  const [expanded, setExpanded] = useState(false);
  const [showDetail, setShowDetail] = useState(true);

  // Filter records by selected year
  const yearRecords = useMemo(() => {
    return records.filter((r) => {
      const eatDate = getEatDateString(r.startAt);
      const yr = parseInt(eatDate.slice(0, 4), 10);
      return yr === selectedYear;
    });
  }, [records, selectedYear]);

  // Attendance stats for selected year
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let excused = 0;
    let late = 0;

    for (const r of yearRecords) {
      if (r.status === 'present') present++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'excused') excused++;
      else if (r.status === 'late') late++;
    }

    const total = present + absent + excused + late;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    return { present, absent, excused, late, total, rate };
  }, [yearRecords]);

  // Map of day string -> most significant attendance status
  const attendanceDayMap = useMemo(() => {
    const map = new Map<string, { status: string; record: UserAttendanceRecord }>();
    for (const r of yearRecords) {
      const dayKey = getEatDateString(r.startAt);
      const existing = map.get(dayKey);
      // Priority: absent > late > excused > present
      if (!existing || r.status === 'absent' || (r.status === 'late' && existing.status === 'present')) {
        map.set(dayKey, { status: r.status, record: r });
      }
    }
    return map;
  }, [yearRecords]);

  // Generate 52-53 weeks for the calendar heatmap (Consistency Style)
  const { weeks, monthHeaders } = useMemo(() => {
    const start = new Date(selectedYear, 0, 1);
    const end = new Date(selectedYear, 11, 31);

    const startOffset = start.getDay();
    const curr = new Date(start);
    curr.setDate(curr.getDate() - startOffset);

    const weeksList: {
      date: Date;
      dateStr: string;
      inYear: boolean;
      status?: string;
      record?: UserAttendanceRecord;
    }[][] = [];
    const monthOffsets: { month: string; colIndex: number }[] = [];
    let lastMonth = -1;
    let col = 0;

    while (curr <= end || curr.getDay() !== 0) {
      const week: {
        date: Date;
        dateStr: string;
        inYear: boolean;
        status?: string;
        record?: UserAttendanceRecord;
      }[] = [];

      for (let d = 0; d < 7; d++) {
        const dateCopy = new Date(curr);
        const y = dateCopy.getFullYear();
        const m = String(dateCopy.getMonth() + 1).padStart(2, '0');
        const day = String(dateCopy.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${day}`;
        const inYear = y === selectedYear;
        const entry = inYear ? attendanceDayMap.get(dateStr) : undefined;

        if (inYear && dateCopy.getMonth() !== lastMonth && d === 0) {
          lastMonth = dateCopy.getMonth();
          monthOffsets.push({ month: MONTH_NAMES[lastMonth] ?? '', colIndex: col });
        }

        week.push({
          date: dateCopy,
          dateStr,
          inYear,
          status: entry?.status,
          record: entry?.record,
        });
        curr.setDate(curr.getDate() + 1);
      }
      weeksList.push(week);
      col++;
    }

    return { weeks: weeksList, monthHeaders: monthOffsets };
  }, [selectedYear, attendanceDayMap]);

  // Group by month for when showDetail is off
  const monthlyBreakdown = useMemo(() => {
    const map = new Map<number, { present: number; total: number }>();
    for (const r of yearRecords) {
      const eatDate = getEatDateString(r.startAt);
      const m = parseInt(eatDate.slice(5, 7), 10) - 1;
      const curr = map.get(m) ?? { present: 0, total: 0 };
      curr.total++;
      if (r.status === 'present' || r.status === 'late') curr.present++;
      map.set(m, curr);
    }
    return Array.from(map.entries())
      .map(([monthIdx, val]) => ({
        monthName: MONTH_NAMES[monthIdx] ?? '',
        monthIdx,
        rate: val.total > 0 ? Math.round((val.present / val.total) * 100) : 0,
        ...val,
      }))
      .sort((a, b) => a.monthIdx - b.monthIdx);
  }, [yearRecords]);

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
              <h2 className="text-base font-bold text-slate-900 leading-none">Attendance</h2>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                {expanded ? 'Detailed Cards' : 'Heatmap'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {stats.rate}% attendance rate across {stats.total} sessions in {selectedYear}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Year Filter Dropdown */}
          <div className="relative inline-flex items-center">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              aria-label="Filter attendance by year"
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

          {/* Show Detail Toggle Switch (when expanded) */}
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
        /* COLLAPSED VIEW: 52-Week Calendar Heatmap (Consistency Style for Attendance) */
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
                        const hasSession = !!cell.status;
                        const timeText = cell.record
                          ? formatCheckIn(cell.record.checkInAt || cell.record.startAt)
                          : '';

                        return (
                          <div
                            key={cell.dateStr}
                            title={
                              !cell.inYear
                                ? ''
                                : hasSession
                                  ? `${cell.dateStr}: ${cell.status?.toUpperCase()} (${timeText})`
                                  : `${cell.dateStr}: No scheduled session`
                            }
                            className={`h-2.5 w-2.5 rounded-[2px] transition-all cursor-pointer relative ${
                              !cell.inYear
                                ? 'opacity-0 pointer-events-none'
                                : getAttendanceStatusDotClass(cell.status)
                            } ${isToday ? 'ring-1.5 ring-slate-800' : ''}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Attendance Status Legend Footer */}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-50 flex-wrap gap-2">
                <div className="flex items-center gap-3 text-[11px] font-medium">
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-[2px] bg-slate-100" />
                    No Session
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-[2px] bg-emerald-500" />
                    Present ({stats.present})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-[2px] bg-blue-500" />
                    Late ({stats.late})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-[2px] bg-amber-500" />
                    Excused ({stats.excused})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-[2px] bg-red-500" />
                    Absent ({stats.absent})
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 font-semibold">
                  Overall: <strong className="text-slate-800">{stats.rate}%</strong> rate
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* EXPANDED VIEW: Attendance Style (Dense Date-Cell Cards or Monthly Summary) */
        <div className="mt-4">
          {/* Status Breakdown Pills */}
          <div className="flex items-center gap-2.5 flex-wrap mb-4 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 border border-emerald-200/60">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {stats.present} Present
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-red-700 border border-red-200/60">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              {stats.absent} Absent
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-amber-700 border border-amber-200/60">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              {stats.excused} Excused
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-blue-700 border border-blue-200/60">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              {stats.late} Late
            </span>
          </div>

          {showDetail ? (
            /* Dense colored date-cell grid matching the screenshot */
            yearRecords.length === 0 ? (
              <div className="py-8 text-center bg-slate-50/60 rounded-2xl border border-slate-100">
                <p className="text-xs font-medium text-slate-400">
                  No attendance records recorded for {selectedYear}.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto pb-2">
                <div className="flex flex-wrap gap-1.5 max-h-[460px] overflow-y-auto p-1">
                  {yearRecords.map((r) => {
                    const dateStr = getEatDateString(r.startAt);
                    const [y, m, d] = dateStr.split('-').map(Number);
                    const dayNum = String(d || 1).padStart(2, '0');
                    const monthStr = MONTH_NAMES[(m ?? 1) - 1] ?? '';
                    const yearShort = String(y || 2026).slice(2);
                    const checkInTime = formatCheckIn(r.checkInAt || r.startAt);

                    // Color theme per status
                    let bgClass = 'bg-emerald-500 text-white';
                    let footerBg = 'bg-emerald-600/30 text-emerald-950';

                    if (r.status === 'absent') {
                      bgClass = 'bg-red-500 text-white';
                      footerBg = 'bg-red-600/30 text-red-950';
                    } else if (r.status === 'excused') {
                      bgClass = 'bg-amber-500 text-white';
                      footerBg = 'bg-amber-600/30 text-amber-950';
                    } else if (r.status === 'late') {
                      bgClass = 'bg-blue-500 text-white';
                      footerBg = 'bg-blue-600/30 text-blue-950';
                    }

                    return (
                      <div
                        key={r.id}
                        title={`${r.sessionName} — ${dateStr} (${r.status})`}
                        className={`group relative flex flex-col justify-between w-[52px] h-[52px] rounded-lg shadow-2xs overflow-hidden transition hover:scale-105 cursor-pointer ${bgClass}`}
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

                        {/* Bottom: Check-in timestamp */}
                        <div
                          className={`px-1 py-0.5 text-[8.5px] font-semibold text-center truncate ${footerBg}`}
                        >
                          {r.status === 'absent'
                            ? 'Absent'
                            : r.status === 'excused'
                              ? 'Excused'
                              : checkInTime || 'Present'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ) : (
            /* Monthly summary breakdown when Show Detail is OFF */
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {monthlyBreakdown.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No data for {selectedYear}</p>
              ) : (
                monthlyBreakdown.map((mb) => (
                  <div
                    key={mb.monthName}
                    className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">{mb.monthName}</span>
                      <span className="text-xs font-extrabold text-emerald-700">{mb.rate}%</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${mb.rate}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      {mb.present} attended of {mb.total} sessions
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
