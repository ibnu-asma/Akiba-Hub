import { NextResponse, type NextRequest } from 'next/server';
import { HUB_COOKIE } from '@/lib/session';

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

/** Route guard — the BFF cookie is the single session artifact (SPEC §5, §8.5). */
export function middleware(req: NextRequest) {
  const token = req.cookies.get(HUB_COOKIE)?.value;
  const { pathname } = req.nextUrl;

  const hasValidToken = Boolean(token && !isTokenExpired(token));

  if (!hasValidToken && pathname !== '/login' && pathname !== '/register-invite') {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    const res = NextResponse.redirect(url);
    if (token) res.cookies.delete(HUB_COOKIE);
    return res;
  }

  if (hasValidToken && pathname === '/login') {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\..*).*)'],
};
