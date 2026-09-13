export interface AttendanceRow {
  userId: string;
  name: string;
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
  totalSolves: number;
  activeDays: number;
  days: { day: string; count: number }[];
}

export interface CompletionRow {
  userId: string;
  name: string;
  solved: number;
  total: number;
  pct: number;
}

export interface MatrixCell {
  attempts: number;
  minutes: number;
}

export interface ExerciseMatrix {
  problems: { id: string; name: string; difficulty: string }[];
  students: { userId: string; name: string; cells: Record<string, MatrixCell> }[];
}

export interface UpsolvingMatrix {
  contests: { id: string; name: string; problems: { pseudo: string; problemId: string }[] }[];
  students: { userId: string; name: string; cells: Record<string, MatrixCell> }[];
}

export interface DivisionsData {
  divisions: {
    name: string;
    minRating: number;
    maxRating: number;
    students: { userId: string; name: string; rating: number }[];
  }[];
  unassigned: { userId: string; name: string; rating: number }[];
}
