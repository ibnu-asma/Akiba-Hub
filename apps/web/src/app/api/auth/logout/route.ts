import { NextResponse, type NextRequest } from 'next/server';
import { HUB_COOKIE, hubCookieOptions } from '@/lib/session';

/** BFF logout — clears the session cookie; the JWT is stateless so nothing else to revoke yet. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(HUB_COOKIE, '', hubCookieOptions(0));
  return res;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  const res = NextResponse.redirect(url);
  res.cookies.set(HUB_COOKIE, '', hubCookieOptions(0));
  return res;
}
