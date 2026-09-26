import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { env } from './env';
import { HUB_COOKIE } from './session';

/**
 * BFF mutation helper — forwards an authenticated write to the Hub API using the
 * session cookie, then relays the structured error contract back to the client
 * form. List reads stay server-side via `hubFetch`; only writes go through here.
 */
export async function proxyAction(path: string, body: unknown, method: 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'POST') {
  const jar = await cookies();
  const token = jar.get(HUB_COOKIE)?.value;

  const upstream = await fetch(new URL(path, env.apiUrl), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: method === 'DELETE' ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });

  const payload = await upstream.json().catch(() => null);

  if (!upstream.ok) {
    const err = payload?.error ?? { code: 'INTERNAL_ERROR', message: upstream.statusText };
    return NextResponse.json({ error: err }, { status: upstream.status });
  }
  return NextResponse.json(payload, { status: upstream.status === 201 ? 201 : 200 });
}

/** BFF GET — forwards an authenticated read using the session cookie. */
export async function proxyGet(path: string) {
  const jar = await cookies();
  const token = jar.get(HUB_COOKIE)?.value;

  const upstream = await fetch(new URL(path, env.apiUrl), {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    cache: 'no-store',
  });

  const payload = await upstream.json().catch(() => null);

  if (!upstream.ok) {
    const err = payload?.error ?? { code: 'INTERNAL_ERROR', message: upstream.statusText };
    return NextResponse.json({ error: err }, { status: upstream.status });
  }
  return NextResponse.json(payload);
}
