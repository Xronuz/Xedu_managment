'use client';

import { Megaphone, FileText, CheckSquare, TrendingUp, Building2, Command } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

interface QuickActionSurfaceProps {
  onOpenCommandPalette?: () => void;
}

export function QuickActionSurface({ onOpenCommandPalette }: QuickActionSurfaceProps) {
  const actions: QuickAction[] = [
    {
      id: 'announcement',
      label: "E'lon",
      icon: Megaphone,
      href: '/dashboard/announcements',
    },
    {
      id: 'report',
      label: 'Hisobot',
      icon: FileText,
      href: '/dashboard/reports',
    },
    {
      id: 'approvals',
      label: 'Tasdiqlash',
      icon: CheckSquare,
      href: '/dashboard/leave-requests',
    },
    {
      id: 'finance',
      label: 'Moliya',
      icon: TrendingUp,
      href: '/dashboard/finance',
    },
    {
      id: 'branches',
      label: 'Filiallar',
      icon: Building2,
      href: '/dashboard/branches',
    },
  ];

  return (
    <>
      {/* Desktop dock — bottom-left */}
      <div className="hidden md:flex fixed bottom-6 left-6 z-30 items-center gap-1 rounded-xl border border-xedu-slate-200 dark:border-xedu-slate-700 bg-white/95 dark:bg-xedu-slate-900/95 backdrop-blur-sm px-2 py-1.5 shadow-premium-sm">
        {actions.map((action) => (
          <DockItem key={action.id} action={action} />
        ))}
        <div className="h-4 w-px bg-xedu-slate-200 dark:bg-xedu-slate-700 mx-1" />
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-xedu-slate-500 hover:text-xedu-slate-800 hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800 transition-colors"
          title="Command palette (Cmd+K)"
        >
          <Command className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Cmd+K</span>
        </button>
      </div>

      {/* Mobile compact bar — bottom centered */}
      <div className="flex md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-30 items-center gap-1 rounded-full border border-xedu-slate-200 dark:border-xedu-slate-700 bg-white/95 dark:bg-xedu-slate-900/95 backdrop-blur-sm px-3 py-2 shadow-premium-sm">
        {actions.slice(0, 4).map((action) => (
          <MobileDockItem key={action.id} action={action} />
        ))}
      </div>
    </>
  );
}

function DockItem({ action }: { action: QuickAction }) {
  const { icon: Icon, label, href, disabled, disabledReason } = action;

  if (disabled) {
    return (
      <button
        disabled
        title={disabledReason}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-xedu-slate-300 cursor-not-allowed"
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </button>
    );
  }

  const Wrapper = href ? Link : 'button';
  const wrapperProps = href ? { href } : { onClick: action.onClick };

  return (
    <Wrapper
      {...(wrapperProps as any)}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-xedu-slate-600 dark:text-xedu-slate-400 hover:text-xedu-primary hover:bg-xedu-primary-light/40 transition-colors"
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden lg:inline">{label}</span>
    </Wrapper>
  );
}

function MobileDockItem({ action }: { action: QuickAction }) {
  const { icon: Icon, label, href, disabled } = action;

  if (disabled || !href) {
    return (
      <button disabled className="h-8 w-8 rounded-full flex items-center justify-center text-xedu-slate-300">
        <Icon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <Link
      href={href}
      className="h-8 w-8 rounded-full flex items-center justify-center text-xedu-slate-500 hover:text-xedu-primary hover:bg-xedu-slate-50 transition-colors"
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </Link>
  );
}
