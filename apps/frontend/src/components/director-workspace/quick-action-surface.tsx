'use client';

import React, { memo } from 'react';
import {
  Megaphone, CheckSquare, Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface QuickActionSurfaceProps {
  onOpenCommandPalette?: () => void;
  activeAction?: string;
}

export const QuickActionSurface = memo(function QuickActionSurface({ onOpenCommandPalette, activeAction }: QuickActionSurfaceProps) {
  // Faqat sidebar da YO'Q bo'lgan amallar
  // Tasdiqlash — sidebar da "Tasdiqlash inbox" sifatida mavjud, olib tashlandi
  const actions = [
    { id: 'announcement', label: "E'lon", icon: Megaphone, href: '/dashboard/announcements', badge: 0 },
  ];

  return (
    <>
      {/* Desktop dock — centered bottom with executive material richness */}
      <div className="hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-30 items-center rounded-2xl xedu-floating-executive overflow-hidden px-1 py-1">
        {actions.map((action) => (
          <DockItem
            key={action.id}
            action={action}
            isActive={activeAction === action.id}
          />
        ))}
        <div className="h-5 w-px bg-xedu-border mx-1.5" />
        <button
          onClick={onOpenCommandPalette}
          className={cn(
            'flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150',
            'text-xedu-slate-400 hover:text-xedu-slate-700 dark:hover:text-xedu-slate-200',
            'hover:bg-xedu-slate-50/80 dark:hover:bg-xedu-slate-800/60'
          )}
          title="Command palette (Cmd+K)"
        >
          <Command className="h-4 w-4" />
          <span className="hidden lg:inline">Cmd+K</span>
        </button>
      </div>

      {/* Mobile compact bar */}
      <div className="flex md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-30 items-center gap-0.5 rounded-full xedu-floating-executive overflow-hidden px-1.5 py-1.5">
        {actions.slice(0, 5).map((action) => (
          <MobileDockItem key={action.id} action={action} />
        ))}
      </div>
    </>
  );
});

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
        'relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all duration-150',
        isActive
          ? 'text-xedu-primary bg-xedu-primary-light/60 dark:bg-xedu-primary/20 shadow-sm border border-xedu-primary/20'
          : 'text-xedu-slate-500 hover:text-xedu-slate-800 dark:hover:text-xedu-slate-200 hover:bg-xedu-slate-50/80 dark:hover:bg-xedu-slate-800/60'
      )}
    >
      <Icon className={cn('h-4 w-4', isActive ? 'text-xedu-primary' : 'text-xedu-slate-400')} />
      <span className="hidden lg:inline">{label}</span>
      {isActive && (
        <div className="absolute bottom-1 left-3 right-3 h-0.5 rounded-full bg-xedu-primary/60" />
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
      className="h-10 w-10 rounded-full flex items-center justify-center text-xedu-slate-500 hover:text-xedu-primary hover:bg-xedu-slate-50/80 dark:hover:bg-xedu-slate-800/60 transition-colors"
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </Link>
  );
}
