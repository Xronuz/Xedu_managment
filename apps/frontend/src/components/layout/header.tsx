'use client';

import { useRouter } from 'next/navigation';
import {
  LogOut, Moon, Sun, Search, User, ChevronDown,
  Settings, ClipboardList, GraduationCap, Activity,
} from 'lucide-react';
import { MobileNav } from '@/components/layout/mobile-nav';
import { NotificationDrawer } from '@/components/layout/notification-drawer';
import { BranchSwitcher } from '@/components/layout/branch-switcher';
import { useTheme } from 'next-themes';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/auth.store';
import { getInitials, getRoleLabel } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { HeaderActionsSlot } from '@/lib/header-actions-context';

const ROLE_COLORS: Record<string, string> = {
  director:       'ring-xedu-violet',
  branch_admin:   'ring-xedu-amber',
  vice_principal: 'ring-xedu-sky',
  teacher:        'ring-xedu-primary',
  class_teacher:  'ring-xedu-primary',
  accountant:     'ring-xedu-gold',
  librarian:      'ring-xedu-sky',
  student:        'ring-xedu-sky',
  parent:         'ring-xedu-ruby',
  super_admin:    'ring-xedu-primary',
};

export function Header() {
  const router = useRouter();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    // Full page reload so middleware runs and clears any stale cookie state
    window.location.href = '/login?reason=logged_out';
  };

  const ringColor = user ? (ROLE_COLORS[user.role] ?? 'ring-xedu-primary') : 'ring-xedu-primary';

  return (
    <header
      className={cn(
        'flex h-[60px] shrink-0 items-center justify-between gap-4 px-5',
        'xedu-material-header edge-emerald',
      )}
    >
      {/* Left: mobile nav + search */}
      <div className="flex items-center gap-3">
        <MobileNav />
        <button
          onClick={() => document.dispatchEvent(new CustomEvent('open-command-palette'))}
          aria-label="Qidiruv panelini ochish"
          className={cn(
            'hidden md:flex items-center gap-2.5 rounded-xl h-[42px] px-4 w-[260px] lg:w-[360px] transition-all duration-150',
            'bg-xedu-slate-100/80 dark:bg-xedu-slate-800/80',
            'border border-xedu-border dark:border-xedu-border',
            'hover:bg-xedu-bg-elevated hover:border-xedu-primary/20 hover:shadow-sm',
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
            'relative flex h-[42px] w-[42px] items-center justify-center rounded-xl transition-all duration-150',
            'text-xedu-slate-500 dark:text-xedu-slate-400 hover:text-xedu-slate-700 dark:hover:text-xedu-slate-200',
            'bg-xedu-slate-100/80 dark:bg-xedu-slate-800/80',
            'border border-xedu-border dark:border-xedu-border',
            'hover:bg-xedu-bg-elevated hover:border-xedu-primary/15 hover:shadow-xs'
          )}
        >
          <Sun  className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>

        <NotificationDrawer />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              'flex items-center gap-2.5 rounded-xl pl-2 pr-4 ml-0.5 h-[52px]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-xedu-primary/30',
              'transition-all duration-200 hover:shadow-sm',
              'bg-xedu-slate-100/80 dark:bg-xedu-slate-800/80',
              'border border-xedu-border dark:border-xedu-border',
              'hover:bg-xedu-bg-elevated hover:border-xedu-primary/15',
            )}>
              <Avatar className={cn('h-8 w-8 ring-2 ring-offset-1 ring-offset-xedu-bg-elevated dark:ring-offset-xedu-slate-900 shrink-0', ringColor)}>
                <AvatarImage src={user?.avatarUrl ?? undefined} />
                <AvatarFallback className="text-[11px] font-bold bg-xedu-primary-light dark:bg-xedu-primary/20 text-xedu-primary dark:text-xedu-primary">
                  {user ? getInitials(user.firstName, user.lastName) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <p className="text-[13px] font-semibold leading-tight text-xedu-slate-800 dark:text-xedu-slate-100">{user?.firstName} {user?.lastName}</p>
                <p className="text-[11px] text-xedu-slate-400 dark:text-xedu-slate-500 leading-tight mt-0.5">{user ? getRoleLabel(user.role) : ''}</p>
              </div>
              <ChevronDown className="hidden md:block h-3.5 w-3.5 text-xedu-slate-400 dark:text-xedu-slate-500 ml-1 shrink-0" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 xedu-surface-floating">
            <DropdownMenuLabel className="pb-1">
              <p className="text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs font-normal text-xedu-slate-400 mt-0.5">{user ? getRoleLabel(user.role) : ''}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} className="cursor-pointer">
              <User className="mr-2 h-4 w-4 text-xedu-slate-400" /> Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings')} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4 text-xedu-slate-400" /> Sozlamalar
            </DropdownMenuItem>
            {user && ['director', 'vice_principal', 'super_admin'].includes(user.role) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] font-normal text-xedu-slate-400/70 py-0.5">Tizim</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push('/dashboard/audit-log')} className="cursor-pointer">
                  <ClipboardList className="mr-2 h-4 w-4 text-xedu-slate-400" /> Audit Log
                </DropdownMenuItem>
                {user.role === 'super_admin' && (
                  <>
                    <DropdownMenuItem onClick={() => router.push('/dashboard/schools')} className="cursor-pointer">
                      <GraduationCap className="mr-2 h-4 w-4 text-xedu-slate-400" /> Maktablar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/dashboard/system-health')} className="cursor-pointer">
                      <Activity className="mr-2 h-4 w-4 text-xedu-slate-400" /> Tizim holati
                    </DropdownMenuItem>
                  </>
                )}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-xedu-ruby focus:text-xedu-ruby focus:bg-xedu-ruby/10">
              <LogOut className="mr-2 h-4 w-4" /> Chiqish
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
