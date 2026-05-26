'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { DirectorDashboard } from './_components/director-dashboard';
import { StudentRedirect } from './_components/student-redirect';
import { AccountantDashboard } from './_components/accountant-dashboard';
import { SuperAdminDashboard } from './_components/super-admin-dashboard';
import { LibrarianDashboard } from './_components/librarian-dashboard';
import { SchoolDashboard } from './_components/school-dashboard';
import { ParentDashboard } from './_components/parent-dashboard';
import { BranchAdminDashboard } from './_components/branch-admin-dashboard';
import { TeacherDashboard } from './_components/teacher-dashboard';
import { RoleWelcome } from '@/components/dashboard/role-welcome';
import { X } from 'lucide-react';

const WELCOME_DISMISSED_KEY = 'xedu_welcome_dismissed';

const OPS_REDIRECT_ROLES = ['director', 'vice_principal', 'branch_admin', 'accountant'];

export default function DashboardPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem(WELCOME_DISMISSED_KEY);
      setShowWelcome(!dismissed);
    }
  }, []);

  // Redirect manager roles to Ops Command Center for a unified cockpit experience
  useEffect(() => {
    if (_hasHydrated && user && OPS_REDIRECT_ROLES.includes(user.role)) {
      router.replace('/dashboard/ops');
    }
  }, [_hasHydrated, user, router]);

  const dismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem(WELCOME_DISMISSED_KEY, '1');
  };

  if (!_hasHydrated) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent border-xedu-primary" />
      </div>
    );
  }

  const role = user?.role;

  return (
    <div className="space-y-6">
      {/* Role-aware welcome orientation — shown on first visit */}
      {showWelcome && role && role !== 'super_admin' && (
        <div className="relative">
          <RoleWelcome />
          <button
            onClick={dismissWelcome}
            className="absolute top-0 right-0 h-8 w-8 flex items-center justify-center rounded-full hover:bg-xedu-slate-100 dark:hover:bg-xedu-slate-800 transition-colors"
            aria-label="Yopish"
          >
            <X className="h-4 w-4 text-xedu-slate-400" />
          </button>
        </div>
      )}

      {role === 'super_admin'  && <SuperAdminDashboard />}
      {role === 'director'     && <DirectorDashboard />}
      {role === 'parent'       && <ParentDashboard />}
      {role === 'student'      && <StudentRedirect />}
      {role === 'accountant'   && <AccountantDashboard />}
      {role === 'librarian'    && <LibrarianDashboard />}
      {role === 'branch_admin' && <BranchAdminDashboard />}
      {(role === 'teacher' || role === 'class_teacher') && <TeacherDashboard />}
      {!role && <SchoolDashboard />}
    </div>
  );
}
