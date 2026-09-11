import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { HUB_COOKIE, hubCookieOptions } from '@/lib/session';

interface AuthSession {
  accessToken?: string;
  user?: { id: string; name: string; email: string; role: string };
  error?: { code: string; message: string; details?: unknown };
}

/** BFF invite redemption (SPEC §5) — registers the invited user and signs them in. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invite details are required.' } },
      { status: 400 },
    );
  }

  const upstream = await fetch(new URL('/auth/register-invite', env.apiUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const payload = (await upstream.json().catch(() => null)) as AuthSession | null;

  if (!upstream.ok || !payload?.accessToken) {
    return NextResponse.json(
      { error: payload?.error ?? { code: 'CONFLICT', message: 'Could not complete registration.' } },
      { status: upstream.status },
    );
  }

  const res = NextResponse.json({ user: payload.user }, { status: 201 });
  res.cookies.set(HUB_COOKIE, payload.accessToken, hubCookieOptions());
  return res;
}
