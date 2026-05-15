'use client';

import { useEffect, useRef, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav';
import { MobileFab } from '@/components/layout/mobile-fab';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { PageErrorBoundary } from '@/components/providers/error-boundary';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';
import { CommandPalette } from '@/components/command-palette';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { HeaderActionsProvider } from '@/lib/header-actions-context';
import { useRoleGuard } from '@/components/auth/role-guard';
import { WorkspaceProvider } from '@/components/workspace-system';
import { authApi } from '@/lib/api/auth';
import { PageTransition } from '@/components/layout/page-transition';

function RealtimeProvider() {
  useRealtimeNotifications();
  return null;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated, restoreAuth } = useAuthStore();
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const [commandOpen, setCommandOpen] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const recoveryAttempted = useRef(false);

  // Role-based route guard — har bir dashboard route'da tekshiradi
  useRoleGuard();

  // Session recovery: zustand cleared lekin server cookie hali valid bo'lsa re-sync qiladi.
  // Faqat sahifa yangilanishida ishlashi kerak, LOGOUT dan keyin EMAS.
  useEffect(() => {
    if (!_hasHydrated) return;
    if (isAuthenticated) {
      // Foydalanuvchi allaqachon autentifikatsiyadan o'tgan.
      // Flagni true qilamiz: logout isAuthenticated-ni false qilganda bu effect
      // session recovery'ni qayta ishga tushirmasin.
      recoveryAttempted.current = true;
      return;
    }
    if (recoveryAttempted.current) return;
    recoveryAttempted.current = true;
    setIsRecovering(true);
    authApi.me()
      .then((meData) => {
        restoreAuth({
          id: meData.id,
          email: meData.email,
          firstName: meData.firstName,
          lastName: meData.lastName,
          role: meData.role,
          schoolId: meData.schoolId,
          branchId: meData.branchId,
        });
      })
      .catch(() => {
        // /auth/clear clears httpOnly cookies server-side then redirects to /login.
        // Direct '/login' would be overridden here and bypass cookie clearing, re-entering the loop.
        window.location.href = '/auth/clear?reason=session_expired';
      })
      .finally(() => setIsRecovering(false));
  }, [_hasHydrated, isAuthenticated, restoreAuth]);

  // bfcache fix: Chrome back-forward cache sahifani qayta ko'rsatganda
  // React effectlari qayta ishlamaydi, shuning uchun pageshow orqali tekshiramiz.
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted && !useAuthStore.getState().isAuthenticated) {
        window.location.reload();
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCommandOpen(p => !p); }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    const h = () => setCommandOpen(true);
    document.addEventListener('open-command-palette', h);
    return () => document.removeEventListener('open-command-palette', h);
  }, []);

  if (!_hasHydrated || isRecovering) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-xedu-bg dark:bg-xedu-slate-950 gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-xedu-primary/10 flex items-center justify-center">
            <svg className="h-5 w-5 text-xedu-primary animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight text-xedu-slate-800 dark:text-xedu-slate-100">Xedu</span>
        </div>
        <div className="h-1 w-24 rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800 overflow-hidden">
          <div className="h-full w-1/2 bg-xedu-primary rounded-full animate-pulse" />
        </div>
        <p className="text-[11px] text-xedu-slate-400 animate-pulse">Yuklanmoqda...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <HeaderActionsProvider>
      <WorkspaceProvider>
        {/* White sidebar + header, gray content with rounded-tl-2xl inner corner */}
        <div className="flex h-screen bg-xedu-bg-canvas dark:bg-xedu-bg-canvas overflow-hidden">
          <RealtimeProvider />

          <div className="hidden md:flex shrink-0">
            <Sidebar />
          </div>

          <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
            <Header />
            <main
              className="flex-1 min-h-0 overflow-y-auto bg-xedu-bg-canvas dark:bg-xedu-bg-canvas rounded-tl-2xl p-6"
              style={{ isolation: 'isolate' }}
            >
              <BreadcrumbNav />
              <PageErrorBoundary>
                <PageTransition>{children}</PageTransition>
              </PageErrorBoundary>
            </main>
          </div>

          <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
          <ConfirmDialog />
          <MobileFab />
        </div>
      </WorkspaceProvider>
    </HeaderActionsProvider>
  );
}
