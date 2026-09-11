/** Attendance statuses + the locked visual semantics from spec §4. */

export const ATTENDANCE_STATUSES = {
  present: 'present',
  absent: 'absent',
  excused: 'excused',
  late: 'late',
} as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[keyof typeof ATTENDANCE_STATUSES];

/** Spec color mapping (CSS-friendly tokens). */
export const ATTENDANCE_COLORS: Record<AttendanceStatus, string> = {
  present: 'green',  // success / solved / present
  absent: 'red',     // absent / unsolved
  excused: 'yellow', // excused / in-progress
  late: 'blue',      // late / informational
};

export const CONTEST_TYPES = {
  standard: 'standard',
  super: 'super',
} as const;
export type ContestType = (typeof CONTEST_TYPES)[keyof typeof CONTEST_TYPES];

export const TRACK_PHASES = {
  python: 'PYTHON',
  phaseI: 'PHASE_I',
  campI: 'CAMP_I',
  phaseII: 'PHASE_II',
  campII: 'CAMP_II',
} as const;
export type TrackPhase = (typeof TRACK_PHASES)[keyof typeof TRACK_PHASES];