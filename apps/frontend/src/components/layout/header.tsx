'use client';

import { Moon, Sun, Search } from 'lucide-react';
import { MobileNav } from '@/components/layout/mobile-nav';
import { NotificationDrawer } from '@/components/layout/notification-drawer';
import { BranchSwitcher } from '@/components/layout/branch-switcher';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { HeaderActionsSlot } from '@/lib/header-actions-context';

export function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header
      className={cn(
        'flex h-[60px] shrink-0 items-center justify-between gap-4 px-5',
        'bg-transparent',
      )}
    >
      {/* Left: mobile nav + search */}
      <div className="flex items-center gap-3">
        <MobileNav />
        <button
          onClick={() => document.dispatchEvent(new CustomEvent('open-command-palette'))}
          aria-label="Qidiruv panelini ochish"
          className={cn(
            'hidden md:flex items-center gap-2.5 rounded-full h-[42px] px-4 w-[260px] lg:w-[360px] transition-all duration-150',
            'bg-xedu-slate-50 dark:bg-xedu-slate-900',
            'border-none',
            'hover:bg-xedu-slate-100 dark:hover:bg-xedu-slate-800 hover:shadow-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xedu-primary/20'
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-xedu-slate-400 dark:text-xedu-slate-500" />
          <span className="flex-1 text-left text-[13px] text-xedu-slate-400 dark:text-xedu-slate-500">Qidiruv: o'quvchi, to'lov, sinf...</span>
          <kbd className="hidden sm:inline-flex h-5 select-none items-center rounded-md bg-xedu-slate-200/80 dark:bg-xedu-slate-700/80 px-1.5 font-mono text-[10px] text-xedu-slate-500 dark:text-xedu-slate-400 tracking-tight">⌘K</kbd>
        </button>
      </div>

      {/* Center: contextual page actions */}
      <div className="flex flex-1 items-center justify-center">
        <HeaderActionsSlot />
      </div>

      {/* Right */}
      <div className="flex items-center gap-2.5">
        <BranchSwitcher />

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Mavzuni o'zgartirish"
          className={cn(
            'relative flex h-[42px] w-[42px] items-center justify-center rounded-full transition-all duration-150',
            'text-xedu-slate-500 dark:text-xedu-slate-400 hover:text-xedu-emerald dark:hover:text-xedu-emerald',
            'bg-xedu-slate-50 dark:bg-xedu-slate-900',
            'border-none',
            'hover:bg-xedu-slate-100 dark:hover:bg-xedu-slate-800 hover:shadow-xs'
          )}
        >
          <Sun  className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>

        <NotificationDrawer />

      </div>
    </header>
  );
}
