'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { getMobilePrimaryNav } from '@/config/navigation';
import { useDisabledModules } from '@/hooks/use-disabled-modules';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MobileMenuSheet } from '@/components/layout/mobile-nav';
import { ProfileSheet } from '@/components/layout/profile-sheet';

function isActive(href: string, exact: boolean | undefined, pathname: string) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

/** Mobile bottom tab bar — primary nav shortcuts + full menu + profile. */
export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const disabledModules = useDisabledModules();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  if (!user) return null;

  const primaryItems = getMobilePrimaryNav(user.role, disabledModules);
  const initials = getInitials(user.firstName, user.lastName);

  return (
    <>
      <nav
        className={cn(
          'md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch justify-around',
          'bg-xedu-bg-elevated dark:bg-xedu-bg-elevated border-t border-xedu-border dark:border-xedu-border',
          'pb-[env(safe-area-inset-bottom)]',
        )}
        aria-label="Asosiy navigatsiya"
      >
        {primaryItems.map((item) => {
          const active = isActive(item.href, item.exact, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-w-0"
            >
              <Icon
                className={cn('h-5 w-5 shrink-0', active ? 'text-xedu-emerald' : 'text-xedu-slate-400')}
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span className={cn(
                'text-2xs font-medium truncate max-w-full px-1',
                active ? 'text-xedu-emerald' : 'text-xedu-slate-400',
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}

        <button
          onClick={() => setMenuOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-w-0"
        >
          <Menu className="h-5 w-5 shrink-0 text-xedu-slate-400" strokeWidth={1.8} />
          <span className="text-2xs font-medium text-xedu-slate-400">Menyu</span>
        </button>

        <button
          onClick={() => setProfileOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-w-0"
        >
          <Avatar className="h-5 w-5 shrink-0 ring-1 ring-xedu-slate-200 dark:ring-xedu-slate-700">
            <AvatarImage src={user.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-xedu-emerald/20 text-[9px] font-bold text-xedu-emerald">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-2xs font-medium text-xedu-slate-400">Profil</span>
        </button>
      </nav>

      <MobileMenuSheet open={menuOpen} onOpenChange={setMenuOpen} />
      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}
