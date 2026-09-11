import { NextResponse, type NextRequest } from 'next/server';
import { HUB_COOKIE } from '@/lib/session';

/** Route guard — the BFF cookie is the single session artifact (SPEC §5, §8.5). */
export function middleware(req: NextRequest) {
  const token = req.cookies.get(HUB_COOKIE)?.value;
  const { pathname } = req.nextUrl;

  if (!token && pathname !== '/login') {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  if (token && pathname === '/login') {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\..*).*)'],
};
