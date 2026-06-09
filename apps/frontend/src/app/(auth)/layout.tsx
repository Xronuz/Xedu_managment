'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { ROLE_HOME, type UserRole } from '@/config/permissions';
import { AuthLoadingGate } from './_components/auth-shell';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const { isAuthenticated, _hasHydrated, user, logout } = useAuthStore();

  useEffect(() => {
    // Don't auto-redirect back to dashboard when the user was sent to login
    // because their session expired. The Zustand store may still have stale
    // isAuthenticated=true from localStorage, while the httpOnly cookie is
    // expired/invalid. Redirecting back would cause a redirect loop.
    if (_hasHydrated && isAuthenticated && user && reason !== 'session_expired') {
      const home = ROLE_HOME[user.role as UserRole] ?? '/dashboard';
      router.replace(home);
    }

    // Clear stale Zustand auth state when arriving at login because of
    // session expiry. This prevents the store from staying dirty across
    // page navigations.
    if (_hasHydrated && isAuthenticated && reason === 'session_expired') {
      logout();
    }
  }, [isAuthenticated, _hasHydrated, user, router, reason, logout]);

  // Show branded loading while store hydrates to avoid form flicker
  if (!_hasHydrated) {
    return <AuthLoadingGate />;
  }

  return <>{children}</>;
}
