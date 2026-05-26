'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Clock } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { ScheduleWorkspace, StudentScheduleView } from './_components/schedule-workspace';
import { StandardEmptyState } from '@/components/ui/standard-empty-state';
import { periodsApi } from '@/lib/api/periods';
import { Skeleton } from '@/components/ui/skeleton';

export default function SchedulePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isStudent = user?.role === 'student' || user?.role === 'parent';

  const { data: periods = [], isLoading } = useQuery({
    queryKey: ['periods'],
    queryFn: () => periodsApi.getAll(),
    enabled: !isStudent,
  });

  if (isStudent) {
    return <StudentScheduleView />;
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (periods.length === 0) {
    return (
      <div className="max-w-2xl mx-auto pt-10">
        <StandardEmptyState
          icon={Clock}
          title="Dars davrlari sozlanmagan"
          description="Dars jadvalini ko'rish va boshqarish uchun avval dars davrlarini (qo'ng'iroq jadvali) sozlang."
          primaryAction={{
            label: 'Maktabni sozlash',
            onClick: () => router.push('/dashboard/setup'),
          }}
          secondaryAction={{
            label: 'Sozlamalar',
            onClick: () => router.push('/dashboard/settings'),
          }}
        />
      </div>
    );
  }

  return <ScheduleWorkspace />;
}
