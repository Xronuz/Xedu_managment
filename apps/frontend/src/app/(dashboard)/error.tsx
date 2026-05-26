'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function DashboardErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-xedu-bg-canvas p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold">Xatolik yuz berdi</h1>
          <p className="text-sm text-xedu-slate-500">
            Sahifani yuklashda muammo yuz berdi. Iltimos, qayta urinib ko&apos;ring yoki bosh sahifaga qayting.
          </p>
        </div>

        {error.digest && (
          <p className="text-xs text-xedu-slate-400 font-mono bg-muted rounded px-2 py-1 inline-block">
            Xato kodi: {error.digest}
          </p>
        )}

        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Qayta yuklash
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <a href="/dashboard">
              <Home className="h-4 w-4" />
              Bosh sahifa
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
