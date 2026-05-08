'use client';

import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentsWorkspace } from './_components/students-workspace';

function StudentsFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64 rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function StudentsPage() {
  return (
    <Suspense fallback={<StudentsFallback />}>
      <StudentsWorkspace />
    </Suspense>
  );
}
