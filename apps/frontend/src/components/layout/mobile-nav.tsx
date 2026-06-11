'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { getNavForRole } from '@/config/navigation';
import { useDisabledModules } from '@/hooks/use-disabled-modules';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuthStore();

  const role = user?.role ?? '';
  const disabledModules = useDisabledModules();
  const navGroups = getNavForRole(role, disabledModules);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetHeader className="px-4 py-4 border-b border-xedu-slate-100">
            <SheetTitle className="text-left text-lg font-bold flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-xedu-primary">
                <GraduationCap className="h-4 w-4 text-white" strokeWidth={2} />
              </div>
              Xedu
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col overflow-y-auto h-[calc(100vh-80px)] px-3 py-2">
            {navGroups.map((group, gi) => (
              <div key={group.title} className={cn(gi > 0 && 'mt-1')}>
                <p className="px-3 py-1.5 text-2xs font-bold uppercase tracking-wider text-xedu-slate-400">
                  {group.title}
                </p>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const isActive = item.exact
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(item.href + '/');
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-[var(--xedu-duration)]',
                          isActive
                            ? 'bg-xedu-primary-light text-xedu-primary'
                            : 'text-xedu-slate-600 hover:bg-xedu-slate-50 hover:text-xedu-slate-900',
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-[18px] w-[18px] shrink-0',
                            isActive ? 'text-xedu-primary' : 'text-xedu-slate-400',
                          )}
                          strokeWidth={1.8}
                        />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
                {gi < navGroups.length - 1 && <Separator className="mt-2 bg-xedu-slate-100" />}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
