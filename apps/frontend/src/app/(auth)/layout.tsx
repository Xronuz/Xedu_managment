'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { ROLE_HOME, type UserRole } from '@/config/permissions';
import { AuthLoadingGate } from './_components/auth-shell';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const { isAuthenticated, _hasHydrated, user, logout } = useAuthStore();
  // Session-expired tozalash faqat BIR MARTA (kelganda) ishlashi kerak.
  // Aks holda foydalanuvchi login qilganda effekt qayta ishga tushib,
  // yangi sessiyani ham logout() bilan o'chirib yuboradi (login → logout poygasi).
  const expiredCleanupDone = useRef(false);

  useEffect(() => {
    if (!_hasHydrated) return;

    // Session muddati tugab kelingan: stale Zustand holatini BIR MARTA tozalab,
    // reason paramni URL'dan olib tashlaymiz. Keyingi effekt ishga tushishlarida
    // (param hali URL'da qolgan bo'lsa ham) oqim oddiy davom etadi — shunda
    // muvaffaqiyatli login bemalol dashboard'ga o'tadi.
    if (reason === 'session_expired' && !expiredCleanupDone.current) {
      expiredCleanupDone.current = true;
      if (isAuthenticated) logout();
      router.replace('/login');
      return;
    }

    // Oddiy holat: tizimda bo'lsa — rolga mos bosh sahifaga yo'naltirish.
    if (isAuthenticated && user) {
      const home = ROLE_HOME[user.role as UserRole] ?? '/dashboard';
      router.replace(home);
    }
  }, [isAuthenticated, _hasHydrated, user, router, reason, logout]);

  // Show branded loading while store hydrates to avoid form flicker
  if (!_hasHydrated) {
    return <AuthLoadingGate />;
  }

  return <>{children}</>;
}
