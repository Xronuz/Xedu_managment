'use client';

import { GraduationCap, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthShellProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Premium institutional auth shell.
 * Left: institutional identity, calm messaging.
 * Right: focused auth interaction area.
 */
export function AuthShell({ children, className }: AuthShellProps) {
  return (
    <div className={cn('min-h-screen flex', className)}>
      {/* ── LEFT PANEL: Institutional identity ─────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[45%] flex-col justify-between relative overflow-hidden bg-xedu-slate-950">
        {/* Subtle emerald accent glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-xedu-primary/[0.04] blur-3xl" />
          <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-xedu-primary/[0.03] blur-3xl" />
        </div>

        <div className="relative z-10 p-10 xl:p-14">
          {/* Logo mark */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-xedu-primary/10 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-xedu-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">Xedu</span>
          </div>
        </div>

        <div className="relative z-10 p-10 xl:p-14 space-y-8">
          <div className="space-y-4 max-w-md">
            <h1 className="text-[28px] xl:text-[32px] font-black tracking-tight text-white leading-tight">
              Ta'lim tashkilotlari uchun<br />
              <span className="text-xedu-primary">operatsion tizim</span>
            </h1>
            <p className="text-sm leading-relaxed text-xedu-slate-400">
              Maktablar, filiallar, o'quvchilar va xodimlar — barchasi bir platformada.
              Xedu ta'lim boshqaruvini sodda, samarali va ishonchli qiladi.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-xedu-slate-500">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              <span>Xavfsiz kirish</span>
            </div>
            <span className="text-xedu-slate-700">·</span>
            <span>Enterprise-grade</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Auth interaction ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center bg-white dark:bg-xedu-slate-950 p-4 sm:p-6 relative">
        {/* Mobile logo */}
        <div className="lg:hidden absolute top-6 left-6 flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-xedu-primary/10 flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-xedu-primary" />
          </div>
          <span className="text-base font-bold tracking-tight text-xedu-slate-900 dark:text-white">Xedu</span>
        </div>

        <div className="w-full max-w-[400px] animate-fade-in duration-[var(--xedu-duration)]">
          {children}
        </div>

        <p className="absolute bottom-6 text-[11px] text-xedu-slate-400 dark:text-xedu-slate-600">
          © {new Date().getFullYear()} Xedu. Barcha huquqlar himoyalangan.
        </p>
      </div>
    </div>
  );
}

/**
 * Branded loading state shown while auth store hydrates.
 */
export function AuthLoadingGate() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-xedu-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-xedu-primary/10 flex items-center justify-center">
          <GraduationCap className="h-5 w-5 text-xedu-primary animate-pulse" />
        </div>
        <p className="text-xs text-xedu-slate-400 animate-pulse">Yuklanmoqda...</p>
      </div>
    </div>
  );
}
