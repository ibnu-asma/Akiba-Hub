/** Hub session cookie contract — shared by middleware and the BFF route handlers. */
export const HUB_COOKIE = 'hub_token';

export function hubCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 7) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
