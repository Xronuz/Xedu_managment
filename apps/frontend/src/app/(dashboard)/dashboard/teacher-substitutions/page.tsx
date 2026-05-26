'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { UserCheck } from 'lucide-react';
import { TeacherSubstitutionsWorkspace } from './_components/teacher-substitutions-workspace';
import { StandardEmptyState } from '@/components/ui/standard-empty-state';
import { teacherSubstitutionsApi } from '@/lib/api/teacher-substitutions';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherSubstitutionsPage() {
  const router = useRouter();

  const { data: listData, isLoading } = useQuery({
    queryKey: ['teacher-substitutions', 'list'],
    queryFn: () => teacherSubstitutionsApi.list({ limit: 1 }),
  });

  const count = (listData as any)?.data?.length ?? (Array.isArray(listData) ? listData.length : 0);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="max-w-2xl mx-auto pt-10">
        <StandardEmptyState
          icon={UserCheck}
          title="Almashtirish ma'lumotlari yo'q"
          description="Hozircha ta'til so'rovlari yoki o'qituvchi almashtirishlari mavjud emas. Yangi ta'til so'rovi yaratilganda, almashtirishni shu yerda boshqarishingiz mumkin."
          primaryAction={{
            label: "Ta'til so'rovlarini ko'rish",
            onClick: () => router.push('/dashboard/leave-requests'),
          }}
        />
      </div>
    );
  }

  return <TeacherSubstitutionsWorkspace />;
}
