'use client';

import { useAuthStore } from '@/store/auth.store';
import { ScheduleWorkspace, StudentScheduleView } from './_components/schedule-workspace';

export default function SchedulePage() {
  const { user } = useAuthStore();
  const isStudent = user?.role === 'student' || user?.role === 'parent';

  if (isStudent) {
    return <StudentScheduleView />;
  }

  return <ScheduleWorkspace />;
}
