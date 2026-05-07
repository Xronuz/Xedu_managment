'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';
import { canAccessRoute, ROLE_HOME, type UserRole } from '@/config/permissions';

/**
 * Role-based route guard hook.
 * Agar user ruxsat etilmagan bo'lsa, redirect qiladi.
 */
export function useRoleGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const allowed = canAccessRoute(user.role, pathname);
    if (!allowed) {
      // Ruxsat yo'q → role'ga mos dashboard'ga yuboramiz
      const home = ROLE_HOME[user.role as UserRole] ?? '/dashboard';
      router.replace(home);
    }
  }, [isAuthenticated, user?.role, pathname, router]);
}

/**
 * Reusable RoleGuard wrapper component.
 */
interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { user } = useAuthStore();
  const router = useRouter();

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      fallback ?? (
        <div className="flex flex-col items-center justify-center h-[60vh] text-xedu-slate-500 dark:text-xedu-slate-400 px-4">
          <div className="h-16 w-16 rounded-2xl bg-xedu-slate-100 dark:bg-xedu-slate-800/60 flex items-center justify-center mb-5">
            <ShieldAlert className="h-8 w-8 text-xedu-slate-400 dark:text-xedu-slate-500" />
          </div>
          <p className="text-lg font-bold text-xedu-slate-800 dark:text-xedu-slate-100 mb-1">Ruxsat yo'q</p>
          <p className="text-sm text-center max-w-sm mb-6">
            Bu sahifani ko'rish uchun sizda yetarli huquq yo'q.
            Agar bu xatolik deb o'ylasangiz, administratoringizga murojaat qiling.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.replace('/dashboard')}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Bosh sahifaga qaytish
          </Button>
        </div>
      )
    );
  }

  return <>{children}</>;
}
