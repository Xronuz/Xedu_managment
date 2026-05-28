'use client';

import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthShellProps {
  children: React.ReactNode;
  className?: string;
}

const LIGHT_VARS = {
  colorScheme: 'light',
  '--background':        '140 6% 97.3%',
  '--foreground':        '150 15% 15%',
  '--muted-foreground':  '150 8% 45%',
  '--card':              '0 0% 100%',
  '--border':            '150 10% 88%',
} as React.CSSProperties;

export function AuthShell({ children, className }: AuthShellProps) {
  return (
    <div
      className={cn('min-h-screen flex', className)}
      style={LIGHT_VARS}
    >
      {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[45%] flex-col justify-between relative overflow-hidden"
        style={{ background: 'linear-gradient(140deg, #0a1a10 0%, #142d1e 55%, #0d2318 100%)' }}
      >
        {/* glow orbs */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(15,123,83,0.18) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-40 -right-40 h-[400px] w-[400px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(15,123,83,0.12) 0%, transparent 70%)' }} />
        </div>

        {/* top: logo */}
        <div className="relative z-10 p-10 xl:p-14">
          <div className="flex items-center gap-3">
            <img
              src="/landing/xedu-emerald-transparent.png"
              alt="Xedu"
              className="h-8 w-auto"
            />
          </div>
        </div>

        {/* bottom: tagline */}
        <div className="relative z-10 p-10 xl:p-14 space-y-8">
          <div className="space-y-4 max-w-md">
            <h1 className="text-[28px] xl:text-[32px] font-black tracking-tight text-white leading-tight">
              Ta&apos;lim tashkilotlari uchun<br />
              <span style={{ color: '#4ade95' }}>operatsion tizim</span>
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Maktablar, filiallar, o&apos;quvchilar va xodimlar — barchasi bir platformada.
              Xedu ta&apos;lim boshqaruvini sodda, samarali va ishonchli qiladi.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              <span>Xavfsiz kirish</span>
            </div>
            <span>·</span>
            <span>Enterprise-grade</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 relative"
        style={{
          background: '#F2F7F4',
          backgroundImage:
            'radial-gradient(60% 60% at 20% 25%, oklch(0.72 0.21 145 / 0.12) 0%, transparent 70%), ' +
            'radial-gradient(50% 50% at 80% 75%, oklch(0.32 0.08 155 / 0.15) 0%, transparent 70%)',
        }}
      >
        {/* mobile logo */}
        <div className="lg:hidden absolute top-6 left-6">
          <img src="/landing/xedu-emerald-transparent.png" alt="Xedu" className="h-7 w-auto" />
        </div>

        <div className="w-full max-w-[400px]">
          {children}
        </div>

        <p className="absolute bottom-6 text-[11px]" style={{ color: 'rgba(37,46,40,0.35)' }}>
          © {new Date().getFullYear()} Xedu. Barcha huquqlar himoyalangan.
        </p>
      </div>
    </div>
  );
}

export function AuthLoadingGate() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F2F7F4' }}>
      <div className="flex flex-col items-center gap-4">
        <img src="/landing/xedu-emerald-transparent.png" alt="Xedu" className="h-9 w-auto animate-pulse" />
        <p className="text-xs" style={{ color: 'rgba(37,46,40,0.45)' }}>Yuklanmoqda...</p>
      </div>
    </div>
  );
}
