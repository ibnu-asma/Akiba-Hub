import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { HUB_COOKIE } from '@/lib/session';

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(HUB_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not logged in' } }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const upstream = await fetch(new URL('/auth/me', env.apiUrl), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body ?? {}),
    cache: 'no-store',
  });

  const payload = await upstream.json().catch(() => null);
  return NextResponse.json(payload, { status: upstream.status });
}

