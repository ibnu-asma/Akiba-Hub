export interface AttendanceRow {
  userId: string;
  name: string;
  groupId?: string | null;
  avatarUrl?: string | null;
  present: number;
  absent: number;
  excused: number;
  late: number;
  total: number;
  presentPct: number;
}

export interface ConsistencyRow {
  userId: string;
  name: string;
  groupId?: string | null;
  avatarUrl?: string | null;
  totalSolves: number;
  activeDays: number;
  days: { day: string; count: number }[];
}

export interface TrackOption {
  id: string;
  name: string;
  phase: string;
  problemCount: number;
}

export interface StudentTrackCompletion {
  trackId: string;
  trackName: string;
  solved: number;
  total: number;
  pct: number;
}

export interface CompletionRow {
  userId: string;
  name: string;
  groupId?: string | null;
  avatarUrl?: string | null;
  solved: number;
  total: number;
  pct: number;
  byTrack?: Record<string, StudentTrackCompletion>;
}

export interface MatrixCell {
  attempts: number;
  minutes: number;
  isUpsolve?: boolean;
}

export interface ExerciseMatrix {
  problems: {
    id: string;
    name: string;
    difficulty: string;
    platform?: string;
    link?: string;
    createdAt?: string;
  }[];
  students: {
    userId: string;
    name: string;
  groupId?: string | null;
  avatarUrl?: string | null;
    cells: Record<string, MatrixCell>;
  }[];
}

export interface UpsolvingMatrix {
  contests: {
    id: string;
    name: string;
    date?: string;
    problems: { pseudo: string; problemId: string; name?: string }[];
  }[];
  students: {
    userId: string;
    name: string;
  groupId?: string | null;
  avatarUrl?: string | null;
    cells: Record<string, MatrixCell>;
  }[];
}

export interface DivisionsData {
  divisions: {
    name: string;
    minRating: number;
    maxRating: number;
    students: { userId: string; name: string; groupId?: string | null; rating: number; avatarUrl?: string | null }[];
  }[];
  unassigned: { userId: string; name: string; groupId?: string | null; rating: number; avatarUrl?: string | null }[];
}

export interface GroupSessionItem {
  id: string;
  name: string;
  startAt: string;
  endAt: string | null;
}

export interface GroupProgressSummary {
  studentCount: number;
  totalPresent: number;
  totalAbsent: number;
  totalExcused: number;
  totalLate: number;
  overallPresentPct: number;
  totalSolves: number;
  avgSolves: number;
  totalExercises: number;
  avgCompleted: number;
  avgCompletionPct: number;
  avgAvailable: number;
}

export interface GroupProgressData {
  group: {
    id: string;
    name: string;
    shortName: string;
    description: string | null;
    country: string | null;
    superGroupId: string | null;
    superGroupName: string | null;
    heads: { id: string; name: string }[];
    students: { id: string; name: string; avatarUrl: string | null }[];
    studentCount: number;
  };
  summary: GroupProgressSummary;
  attendance: AttendanceRow[];
  attendanceSessions: GroupSessionItem[];
  sessionStatusByStudent: Record<string, Record<string, string>>;
  consistency: ConsistencyRow[];
  completion: CompletionRow[];
  tracks?: TrackOption[];
  exercise: ExerciseMatrix;
  upsolving: UpsolvingMatrix;
  divisions: DivisionsData;
}
