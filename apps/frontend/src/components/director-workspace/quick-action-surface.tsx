'use client';

import {
  Megaphone, FileText, CheckSquare, TrendingUp, Building2, Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface QuickActionSurfaceProps {
  onOpenCommandPalette?: () => void;
  activeAction?: string;
}

export function QuickActionSurface({ onOpenCommandPalette, activeAction }: QuickActionSurfaceProps) {
  const actions = [
    { id: 'announcement', label: "E'lon", icon: Megaphone, href: '/dashboard/announcements', badge: 0 },
    { id: 'report', label: 'Hisobot', icon: FileText, href: '/dashboard/reports', badge: 0 },
    { id: 'approvals', label: 'Tasdiqlash', icon: CheckSquare, href: '/dashboard/leave-requests', badge: 0 },
    { id: 'finance', label: 'Moliya', icon: TrendingUp, href: '/dashboard/finance', badge: 0 },
    { id: 'branches', label: 'Filiallar', icon: Building2, href: '/dashboard/branches', badge: 0 },
  ];

  return (
    <>
      {/* Desktop dock — centered bottom */}
      <div className="hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-30 items-center rounded-xl bg-xedu-bg-floating dark:bg-xedu-bg-floating border border-xedu-border shadow-premium-lg overflow-hidden">
        {actions.map((action) => (
          <DockItem
            key={action.id}
            action={action}
            isActive={activeAction === action.id}
          />
        ))}
        <div className="h-5 w-px bg-xedu-slate-200 dark:bg-xedu-slate-700 mx-1" />
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-semibold text-xedu-slate-400 hover:text-xedu-slate-700 hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800 transition-colors"
          title="Command palette (Cmd+K)"
        >
          <Command className="h-4 w-4" />
          <span className="hidden lg:inline">Cmd+K</span>
        </button>
      </div>

      {/* Mobile compact bar */}
      <div className="flex md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-30 items-center gap-0.5 rounded-full bg-xedu-bg-floating dark:bg-xedu-bg-floating border border-xedu-border shadow-premium-lg overflow-hidden px-1.5 py-1.5">
        {actions.slice(0, 5).map((action) => (
          <MobileDockItem key={action.id} action={action} />
        ))}
      </div>
    </>
  );
}

function DockItem({
  action,
  isActive,
}: {
  action: { id: string; label: string; icon: React.ElementType; href: string };
  isActive?: boolean;
}) {
  const { icon: Icon, label, href } = action;

  return (
    <Link
      href={href}
      className={cn(
        'relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors',
        isActive
          ? 'text-xedu-primary bg-xedu-primary-light/40'
          : 'text-xedu-slate-500 hover:text-xedu-slate-800 hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800'
      )}
    >
      <Icon className={cn('h-4 w-4', isActive && 'text-xedu-primary')} />
      <span className="hidden lg:inline">{label}</span>
      {isActive && (
        <div className="absolute bottom-1 left-3 right-3 h-0.5 rounded-full bg-xedu-primary" />
      )}
    </Link>
  );
}

function MobileDockItem({
  action,
}: {
  action: { id: string; label: string; icon: React.ElementType; href: string };
}) {
  const { icon: Icon, label, href } = action;

  return (
    <Link
      href={href}
      className="h-9 w-9 rounded-full flex items-center justify-center text-xedu-slate-500 hover:text-xedu-primary hover:bg-xedu-slate-50 transition-colors"
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </Link>
  );
}
