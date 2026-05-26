'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function TimetableAnalyticsErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Timetable analytics error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Jadval analitikasi yuklanmadi</h2>
          <p className="text-sm text-xedu-slate-500">
            Jadval analitikasini yuklashda xatolik yuz berdi. Qayta urinib ko&apos;ring.
          </p>
        </div>

        {error.digest && (
          <p className="text-xs text-xedu-slate-400 font-mono bg-muted rounded px-2 py-1 inline-block">
            {error.digest}
          </p>
        )}

        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset} size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Qayta yuklash
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-2">
            <a href="/dashboard">
              <Home className="h-4 w-4" />
              Dashboard
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
