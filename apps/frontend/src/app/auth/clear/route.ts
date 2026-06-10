import { NextRequest, NextResponse } from 'next/server';

/**
 * Resolve the canonical base URL for redirects.
 * Mirrors the same helper in middleware.ts — must be kept in sync.
 */
function getBaseUrl(request: NextRequest): string {
  const fwdHost = request.headers.get('x-forwarded-host');
  const fwdProto = request.headers.get('x-forwarded-proto');
  if (fwdHost && fwdProto) {
    return `${fwdProto}://${fwdHost}`;
  }

  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  return request.nextUrl.origin;
}

/**
 * Clears auth cookies (access_token, refresh_token) and redirects to /login.
 *
 * Called by the API client when token refresh fails, because httpOnly cookies
 * cannot be cleared from client-side JS — only the server can do it via Set-Cookie.
 *
 * Why this exists: the middleware checks the access_token cookie to decide if
 * the user is authenticated. If refresh fails but the cookie isn't cleared,
 * middleware keeps redirecting /login → /dashboard → infinite loop.
 */
export async function GET(request: NextRequest) {
  const reason = request.nextUrl.searchParams.get('reason') ?? '';
  const loginUrl = new URL('/login', getBaseUrl(request));
  if (reason) {
    loginUrl.searchParams.set('reason', reason);
  }
  const response = NextResponse.redirect(loginUrl);

  // Determine HTTPS from x-forwarded-proto (trust proxy) or request URL scheme
  const fwdProto = request.headers.get('x-forwarded-proto');
  const isHttps = fwdProto ? fwdProto === 'https' : getBaseUrl(request).startsWith('https');
  const cookieOpts = {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? ('none' as const) : ('lax' as const),
    path: '/',
    maxAge: 0,
  };

  response.cookies.set('access_token', '', cookieOpts);
  response.cookies.set('refresh_token', '', cookieOpts);

  return response;
}
