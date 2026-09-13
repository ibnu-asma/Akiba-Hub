import { cache } from 'react';
import { cookies } from 'next/headers';
import { env } from './env';
import { HUB_COOKIE } from './session';

/** Structured error body produced by the API's ErrorFilter — one contract everywhere. */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class HubApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody,
  ) {
    super(body.message);
    this.name = 'HubApiError';
  }
}

/** Authenticated server-side call into the Hub API using the BFF cookie. */
export async function hubFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const jar = await cookies();
  const token = jar.get(HUB_COOKIE)?.value;

  const res = await fetch(new URL(path, env.apiUrl), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const parsed = (await res.json().catch(() => null)) as { error?: ApiErrorBody } | null;
    const body = parsed?.error ?? { code: 'INTERNAL_ERROR', message: res.statusText };
    throw new HubApiError(res.status, body);
  }
  return (await res.json()) as T;
}

export interface Me {
  id: string;
  name: string;
  email: string;
  role: string;
  groupId: string | null;
  superGroupId: string | null;
  rating: number;
  avatarUrl: string | null;
  country: string | null;
  university: string | null;
  department?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  github?: string | null;
  studentId?: string | null;
  bio?: string | null;
  createdAt?: string;
}

export interface UserAttendanceRecord {
  id: string;
  sessionId: string;
  sessionName: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  status: 'present' | 'absent' | 'late' | 'excused';
  checkInAt: string | null;
}

export type UserDto = Me;

/** Admin view of a user — includes group assignment + soft-delete flag (SPEC §8.7). */
export interface UserSummaryDto extends Me {
  groupId: string | null;
  isRemoved: boolean;
  rating: number;
  avatarUrl: string | null;
}

/** /auth/me — request-deduped so layout and pages share a single upstream call. */
export const getMe = cache(async (): Promise<Me | null> => {
  try {
    return await hubFetch<Me>('/auth/me');
  } catch {
    return null;
  }
});

export interface Activity {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  createdAt: string;
}

export interface SuperGroup {
  id: string;
  name: string;
  createdAt: string;
  groups: { id: string; name: string; shortName: string }[];
}

export interface Group {
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
}

export interface SessionDto {
  id: string;
  name: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  lecturer: string | null;
  resourceLink?: string | null;
  recordingLink?: string | null;
  createdAt: string;
}

export interface ProblemDto {
  id: string;
  name: string;
  platform: string;
  difficulty: string;
  tags: string[];
  link: string;
  addedBy: string;
  createdAt: string;
}

export interface TrackDto {
  id: string;
  superGroupId: string;
  superGroupName: string;
  phase: string;
  name: string;
  sortOrder: number;
  problemCount: number;
  createdAt: string;
}

export interface ExerciseDto {
  id: string;
  problemId: string;
  problemName: string;
  difficulty: string;
  platform: string;
  tags: string[];
  link: string;
  trackId: string;
  trackName: string;
  phase: string;
  superGroupId: string;
  superGroupName: string;
  sortOrder: number;
  createdAt?: string;
}

export interface ContestDto {
  id: string;
  name: string;
  number: number | null;
  type: string;
  unrated: boolean;
  date: string;
  standingsLink: string | null;
  createdBy: string;
  createdAt: string;
  groupNames: string[];
  groupIds: string[];
  superGroupIds: string[];
  groupCount: number;
  problemCount: number;
}

export interface ContestProblemDto {
  problemId: string;
  pseudo: string;
  name: string;
  difficulty: string;
  platform: string;
  link: string;
  tags?: string[];
  createdAt?: string;
}

export interface DailyProblemDto {
  id: string;
  superGroupId: string;
  problemId: string;
  date: string;
  active: boolean;
  problemName: string;
  platform: string;
  difficulty: string;
  link: string;
}

export interface CompletionRow {
  userId: string;
  name: string;
  solved: number;
  total: number;
  pct: number;
}

export interface FundDto {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  createdAt: string;
}

export interface FundWithRollupDto extends FundDto {
  paidTotal: number;
  pendingTotal: number;
}

export interface SubmissionDto {
  id: string;
  userId: string;
  userName: string | null;
  avatarUrl: string | null;
  problemId: string;
  problemName: string | null;
  language: string;
  timeSpentMin: number;
  tries: number;
  source: string;
  createdAt: string;
}

export interface PostDto {
  id: string;
  userId: string;
  userName: string | null;
  userAvatar?: string | null;
  userRole?: string | null;
  title: string;
  body: string;
  votesUp: number;
  votesDown: number;
  score: number;
  commentCount: number;
  myVote?: number;
  createdAt: string;
}

export interface CommentDto {
  id: string;
  userId?: string;
  userName: string | null;
  userAvatar?: string | null;
  userRole?: string | null;
  body: string;
  createdAt: string;
}

export interface StipendDto {
  id: string;
  userId: string;
  userName: string | null;
  month: string;
  amount: number;
  mode: string;
  status: string;
  createdAt: string;
}

/** Non-throwing wrapper — dashboards degrade to empty states, never crash. */
export async function safe<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch {
    return null;
  }
}
