'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { ROLE_HOME, type UserRole } from '@/config/permissions';
import { AuthLoadingGate } from './_components/auth-shell';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated, user } = useAuthStore();

  useEffect(() => {
    if (_hasHydrated && isAuthenticated && user) {
      const home = ROLE_HOME[user.role as UserRole] ?? '/dashboard';
      router.replace(home);
    }
  }, [isAuthenticated, _hasHydrated, user, router]);

  // Show branded loading while store hydrates to avoid form flicker
  if (!_hasHydrated) {
    return <AuthLoadingGate />;
  }

  return <>{children}</>;
}
