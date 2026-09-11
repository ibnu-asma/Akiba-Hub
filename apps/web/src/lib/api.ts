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
}

export type UserDto = Me;

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
  country: string;
  superGroupId: string;
  heads: { id: string; name: string }[];
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
