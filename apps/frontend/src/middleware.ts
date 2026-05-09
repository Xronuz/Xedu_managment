import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ROUTE_PERMISSIONS, ROLE_HOME, type UserRole } from '@/config/permissions';

/**
 * Simple JWT payload decoder (no signature verification — backend handles that).
 * Works in Edge Runtime (no jsonwebtoken dependency needed).
 */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/accept-invite', '/first-login', '/logout', '/auth/clear'];

// Build ROLE_RESTRICTIONS from ROUTE_PERMISSIONS (single source of truth)
const ROLE_RESTRICTIONS = Object.entries(ROUTE_PERMISSIONS).map(([path, roles]) => ({
  path,
  roles: roles as string[],
}));

// ─── Middleware ───────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets & API routes — skip
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    /\.(?:png|jpg|jpeg|svg|gif|ico|css|js|woff|woff2)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;
  const payload = token ? decodeJwtPayload(token) : null;
  const isAuthenticated = !!payload && typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
  const role = (payload?.role as string) || '';
  const branchId = (payload?.branchId as string) || '';

  // ── 1. Public auth pages ──────────────────────────────────────────────
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    // First-login enforcement: even on public pages, force first-login users
    if (isAuthenticated && payload?.isFirstLogin === true && pathname !== '/first-login') {
      return NextResponse.redirect(new URL('/first-login', request.url));
    }
    // Already logged in → redirect away from login pages
    if (isAuthenticated && pathname !== '/first-login') {
      const home = ROLE_HOME[role as UserRole] ?? '/dashboard';
      return NextResponse.redirect(new URL(home, request.url));
    }
    return NextResponse.next();
  }

  // ── 1.5. /dashboard/classes → /dashboard/education (duplicate route) ───
  if (pathname === '/dashboard/classes') {
    return NextResponse.redirect(new URL('/dashboard/education', request.url));
  }

  // ── 2. Dashboard routes require authentication ────────────────────────
  if (pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      const login = new URL('/login', request.url);
      login.searchParams.set('reason', 'session_expired');
      return NextResponse.redirect(login);
    }

    // First-login enforcement: must complete password change before accessing dashboard
    if (payload?.isFirstLogin === true && pathname !== '/dashboard/onboarding') {
      return NextResponse.redirect(new URL('/first-login', request.url));
    }

    // Branch guard: every authenticated non-super_admin must have a branchId
    if (role !== 'super_admin' && !branchId && pathname !== '/dashboard/onboarding') {
      return NextResponse.redirect(new URL('/dashboard/onboarding', request.url));
    }

    // Role-specific route guards (from ROUTE_PERMISSIONS)
    for (const restriction of ROLE_RESTRICTIONS) {
      if (pathname === restriction.path || pathname.startsWith(restriction.path + '/')) {
        if (!restriction.roles.includes(role)) {
          const home = ROLE_HOME[role as UserRole] ?? '/dashboard';
          return NextResponse.redirect(new URL(home, request.url));
        }
      }
    }
  }

  return NextResponse.next();
}

// ─── Matcher ──────────────────────────────────────────────────────────────────
// Run on all routes except static files & API routes (already handled above)
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)'],
};
