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

/** Problem platforms the Hub links out to (spec §6.3 sources). */
export const PROBLEM_PLATFORMS = {
  leetcode: 'leetcode',
  codeforces: 'codeforces',
  hackerrank: 'hackerrank',
  codesignal: 'codesignal',
  atcoder: 'atcoder',
  geeksforgeeks: 'geeksforgeeks',
  other: 'other',
} as const;
export type ProblemPlatform = (typeof PROBLEM_PLATFORMS)[keyof typeof PROBLEM_PLATFORMS];

/** Difficulty tiers — the Easy/Medium/Hard badges (spec §6.3). */
export const PROBLEM_DIFFICULTIES = {
  easy: 'easy',
  medium: 'medium',
  hard: 'hard',
} as const;
export type ProblemDifficulty = (typeof PROBLEM_DIFFICULTIES)[keyof typeof PROBLEM_DIFFICULTIES];

/** Human labels for the five program phases (spec §Summary C). */
export const TRACK_PHASE_LABELS: Record<TrackPhase, string> = {
  PYTHON: 'Python Track',
  PHASE_I: 'Education Phase I',
  CAMP_I: 'Camp I',
  PHASE_II: 'Education Phase II',
  CAMP_II: 'Camp II',
};