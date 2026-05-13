'use client';

import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentsWorkspace } from './_components/payments-workspace';
import { FinanceSectionNav } from '@/components/finance/finance-section-nav';

function PaymentsFallback() {
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

export default function PaymentsPage() {
  return (
    <div>
      <FinanceSectionNav />
      <Suspense fallback={<PaymentsFallback />}>
        <PaymentsWorkspace />
      </Suspense>
    </div>
  );
}
