'use client';

import { useAuthStore } from '@/store/auth.store';
import { DirectorWelcome } from './director-welcome';
import { BranchAdminWelcome } from './branch-admin-welcome';
import { TeacherWelcome } from './teacher-welcome';
import { ParentWelcome } from './parent-welcome';
import { StudentWelcome } from './student-welcome';

/**
 * Role-aware welcome/orientation component.
 * Renders role-specific first-experience guidance instead of a generic empty dashboard.
 *
 * Usage: place this at the top of the main dashboard page (`/dashboard`)
 * or conditionally show it based on a "first visit" flag.
 */
export function RoleWelcome() {
  const { user } = useAuthStore();
  const role = user?.role;

  switch (role) {
    case 'director':
    case 'super_admin':
      return <DirectorWelcome />;
    case 'branch_admin':
      return <BranchAdminWelcome />;
    case 'teacher':
    case 'class_teacher':
      return <TeacherWelcome />;
    case 'parent':
      return <ParentWelcome />;
    case 'student':
      return <StudentWelcome />;
    default:
      return <DirectorWelcome />;
  }
}
