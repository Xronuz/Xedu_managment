'use client';

import { Shield, BarChart3, Users, Calendar, CreditCard, BookOpen } from 'lucide-react';
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

const FEATURES = [
  { icon: Users,     label: "O'quvchilar",    desc: 'Qayd va tarix',      color: 'rgba(79,196,122,0.18)', iconColor: '#4FC47A' },
  { icon: Calendar,  label: 'Dars jadvali',   desc: 'Avtomatik jadval',   color: 'rgba(99,179,237,0.18)', iconColor: '#63B3ED' },
  { icon: BarChart3, label: 'Analitika',      desc: 'Real-time hisobot',  color: 'rgba(159,122,234,0.18)', iconColor: '#9F7AEA' },
  { icon: CreditCard,label: 'Moliya',         desc: "To'lov boshqaruv",   color: 'rgba(246,173,85,0.18)', iconColor: '#F6AD55' },
  { icon: BookOpen,  label: "Ta'lim",         desc: "O'quv jarayoni",     color: 'rgba(79,196,122,0.18)', iconColor: '#4FC47A' },
  { icon: Shield,    label: 'Xavfsizlik',     desc: 'Enterprise himoya',  color: 'rgba(99,179,237,0.18)', iconColor: '#63B3ED' },
];

export function AuthShell({ children, className }: AuthShellProps) {
  return (
    <div
      className={cn('min-h-screen flex', className)}
      style={LIGHT_VARS}
    >
      {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-[52%] flex-col justify-between relative overflow-hidden"
        style={{ background: 'linear-gradient(140deg, #091510 0%, #122519 55%, #0c1e14 100%)' }}
      >
        {/* glow orbs */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(15,123,83,0.20) 0%, transparent 70%)' }} />
          <div className="absolute top-1/2 right-0 h-[360px] w-[360px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(79,196,122,0.07) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(15,123,83,0.14) 0%, transparent 70%)' }} />
        </div>

        {/* top: logo */}
        <div className="relative z-10 p-10 xl:p-14">
          <div className="flex items-center gap-3">
            <img src="/landing/xedu-emerald-transparent.png" alt="Xedu" className="h-8 w-auto" />
          </div>
        </div>

        {/* middle: tagline + feature grid */}
        <div className="relative z-10 px-10 xl:px-14 flex-1 flex flex-col justify-center space-y-10">
          {/* tagline */}
          <div className="space-y-4 max-w-sm">
            <h1 className="text-[30px] xl:text-[34px] font-black tracking-tight text-white leading-tight">
              Ta&apos;lim guruhi uchun<br />
              <span style={{ color: '#4ade95' }}>operatsion tizim</span>
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.48)' }}>
              Maktablar, filiallar, o&apos;quvchilar va xodimlarni — barchasi bir platformada boshqaring.
            </p>
          </div>

          {/* feature grid */}
          <div className="grid grid-cols-3 gap-2.5 max-w-sm">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.label}
                  className="rounded-xl p-3 space-y-2"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: f.color }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: f.iconColor }} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-white/80">{f.label}</p>
                    <p className="text-[10px] text-white/35 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* trust badges */}
          <div className="flex items-center gap-5 text-xs" style={{ color: 'rgba(255,255,255,0.28)' }}>
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" style={{ color: 'rgba(79,196,122,0.7)' }} />
              <span>SSL himoyali</span>
            </div>
            <div className="h-3 w-px" style={{ background: 'rgba(255,255,255,0.12)' }} />
            <span>Enterprise-grade</span>
            <div className="h-3 w-px" style={{ background: 'rgba(255,255,255,0.12)' }} />
            <span>GDPR compliant</span>
          </div>
        </div>

        <div className="relative z-10 p-10 xl:p-14">
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            © {new Date().getFullYear()} Xedu. Barcha huquqlar himoyalangan.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 relative"
        style={{
          background: '#EEF5F0',
          backgroundImage:
            'radial-gradient(65% 55% at 15% 20%, rgba(79,196,122,0.13) 0%, transparent 70%), ' +
            'radial-gradient(55% 50% at 85% 80%, rgba(15,123,83,0.10) 0%, transparent 70%)',
        }}
      >
        {/* mobile logo */}
        <div className="lg:hidden absolute top-6 left-6">
          <img src="/landing/xedu-emerald-transparent.png" alt="Xedu" className="h-7 w-auto" />
        </div>

        <div className="w-full max-w-[420px]">
          {children}
        </div>
      </div>
    </div>
  );
}

export function AuthLoadingGate() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#EEF5F0' }}>
      <div className="flex flex-col items-center gap-4">
        <img src="/landing/xedu-emerald-transparent.png" alt="Xedu" className="h-9 w-auto animate-pulse" />
        <p className="text-xs" style={{ color: 'rgba(37,46,40,0.45)' }}>Yuklanmoqda...</p>
      </div>
    </div>
  );
}
