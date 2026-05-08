'use client';

import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ClassesWorkspace } from './_components/classes-workspace';

function ClassesFallback() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-8 w-full" />
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
      </div>
    </div>
  );
}

export default function ClassesPage() {
  return (
    <Suspense fallback={<ClassesFallback />}>
      <ClassesWorkspace />
    </Suspense>
  );
}
