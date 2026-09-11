import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { HUB_COOKIE, hubCookieOptions } from '@/lib/session';

interface AuthSession {
  accessToken?: string;
  user?: { id: string; name: string; email: string; role: string };
  error?: { code: string; message: string };
}

/** BFF login — exchanges credentials for an httpOnly session cookie. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Email and password are required.' } },
      { status: 400 },
    );
  }

  const upstream = await fetch(new URL('/auth/login', env.apiUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const payload = (await upstream.json().catch(() => null)) as AuthSession | null;

  if (!upstream.ok || !payload?.accessToken) {
    return NextResponse.json(
      { error: payload?.error ?? { code: 'FORBIDDEN', message: 'Invalid email or password.' } },
      { status: upstream.status },
    );
  }

  const res = NextResponse.json({ user: payload.user });
  res.cookies.set(HUB_COOKIE, payload.accessToken, hubCookieOptions());
  return res;
}
