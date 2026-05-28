'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';
import { DemoRequestsPanel } from './_components/demo-requests-panel';
import { C } from '../_components/shared-widgets';

export default function DemoRequestsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Super Admin only
  if (user?.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-xedu-slate-500 px-4">
        <div className="h-16 w-16 rounded-2xl bg-xedu-slate-100 flex items-center justify-center mb-5">
          <Rocket className="h-8 w-8 text-xedu-slate-400" />
        </div>
        <p className="text-lg font-bold text-xedu-slate-800 mb-1">Ruxsat yo'q</p>
        <p className="text-sm text-center max-w-sm mb-6">
          Bu sahifa faqat Super Admin uchun.
        </p>
        <Button variant="outline" size="sm" onClick={() => router.replace('/dashboard')}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Bosh sahifaga qaytish
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-black tracking-tight leading-none" style={{ color: C.text }}>
            Demo So'rovlar
          </h1>
          <p className="text-[15px] mt-1.5 font-medium" style={{ color: C.muted }}>
            Landing sahifasidan kelgan barcha demo so'rovlar
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Dashboard
        </Button>
      </div>

      <div className="rounded-2xl border p-6" style={{ borderColor: C.border, background: C.card }}>
        <DemoRequestsPanel />
      </div>
    </div>
  );
}
