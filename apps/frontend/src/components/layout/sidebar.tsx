'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { cn, getCompactRoleLabel } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useBranchStore } from '@/store/branch.store';
import { useUIStore } from '@/store/ui.store';
import { getNavForRole } from '@/config/navigation';
import type { NavItem } from '@/config/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.[0] ?? '';
  const l = lastName?.[0] ?? '';
  return (f + l).toUpperCase() || 'U';
}

function isNavActive(item: NavItem, pathname: string): boolean {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + '/');
}

/* ── Nav Link ────────────────────────────────────────────────────────────── */

function NavLink({ item, pathname, collapsed }: {
  item: NavItem; pathname: string; collapsed: boolean;
}) {
  const active = isNavActive(item, pathname);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-150',
        collapsed ? 'justify-center px-2' : '',
        active
          ? 'bg-leaf/12 text-leaf-deep dark:bg-leaf/20 dark:text-leaf'
          : 'text-[#252E28]/65 hover:bg-leaf/8 hover:text-leaf-deep dark:text-slate-400 dark:hover:bg-leaf/15 dark:hover:text-leaf',
      )}
    >
      {/* active left rail */}
      {active && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-leaf" />
      )}

      {/* icon container */}
      <span className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-150',
        active
          ? 'bg-leaf/20 text-leaf-deep dark:bg-leaf/30 dark:text-leaf'
          : 'text-[#252E28]/40 group-hover:text-leaf-deep dark:text-slate-500 dark:group-hover:text-leaf',
      )}>
        <Icon className={cn('shrink-0', collapsed ? 'h-[18px] w-[18px]' : 'h-4 w-4')}
          strokeWidth={active ? 2.2 : 1.8} />
      </span>

      {!collapsed && (
        <span className="truncate">{item.label}</span>
      )}
    </Link>
  );
}

/* ── Group Header ────────────────────────────────────────────────────────── */

function GroupHeader({ title, collapsed, expanded, onToggle }: {
  title: string; collapsed: boolean; expanded?: boolean; onToggle?: () => void;
}) {
  if (collapsed) {
    return (
      <div className="my-2 flex justify-center">
        <div className="h-px w-6 rounded-full bg-leaf/20 dark:bg-leaf/15" />
      </div>
    );
  }
  return (
    <button
      onClick={onToggle}
      className={cn(
        'mb-1 mt-4 flex w-full items-center justify-between px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest transition-colors',
        onToggle ? 'cursor-pointer' : 'cursor-default',
        'text-leaf-deep/50 hover:text-leaf-deep dark:text-leaf/40 dark:hover:text-leaf',
      )}
    >
      <span>{title}</span>
      {onToggle && (
        <ChevronDown className={cn(
          'h-3 w-3 shrink-0 transition-transform duration-150',
          expanded ? 'rotate-0' : '-rotate-90',
        )} />
      )}
    </button>
  );
}

/* ── Branch Context ──────────────────────────────────────────────────────── */

function BranchContext({ collapsed }: { collapsed: boolean }) {
  const { activeBranchMeta } = useBranchStore();
  const { user } = useAuthStore();
  if (!user) return null;

  const branchName = activeBranchMeta?.name ?? 'Barcha filiallar';

  if (collapsed) {
    return (
      <div className="flex justify-center py-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-leaf/12 dark:bg-leaf/20">
          <span className="text-[10px] font-bold text-leaf-deep dark:text-leaf">
            {branchName[0]}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-2 mb-2 rounded-xl border border-leaf/15 bg-leaf/8 px-3 py-2 dark:border-leaf/20 dark:bg-leaf/10">
      <p className="text-[10px] font-bold uppercase tracking-widest text-leaf-deep/50 dark:text-leaf/40">
        Filial
      </p>
      <p className="mt-0.5 truncate text-xs font-semibold text-leaf-deep dark:text-leaf">
        {branchName}
      </p>
    </div>
  );
}

/* ── Profile Footer ──────────────────────────────────────────────────────── */

function ProfileFooter({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuthStore();
  if (!user) return null;

  const initials  = getInitials(user.firstName, user.lastName);
  const fullName  = `${user.firstName} ${user.lastName}`.trim() || user.email;

  if (collapsed) {
    return (
      <div className="flex justify-center py-3">
        <Avatar className="h-8 w-8 ring-2 ring-leaf/20">
          <AvatarImage src={user.avatarUrl ?? undefined} />
          <AvatarFallback className="bg-leaf/15 text-xs font-bold text-leaf-deep dark:bg-leaf/25 dark:text-leaf">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  return (
    <div className="mx-2 mb-2 flex items-center gap-2.5 rounded-xl border border-leaf/15 bg-leaf/8 px-3 py-2.5 dark:border-leaf/20 dark:bg-leaf/10">
      <Avatar className="h-8 w-8 shrink-0 ring-2 ring-leaf/20">
        <AvatarImage src={user.avatarUrl ?? undefined} />
        <AvatarFallback className="bg-leaf/15 text-xs font-bold text-leaf-deep dark:bg-leaf/25 dark:text-leaf">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-[#252E28] dark:text-slate-100">
          {fullName}
        </p>
        <p className="truncate text-[10px] text-leaf-deep/60 dark:text-leaf/50">
          {getCompactRoleLabel(user.role)}
        </p>
      </div>
    </div>
  );
}

/* ── Sidebar ─────────────────────────────────────────────────────────────── */

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  const role      = user?.role ?? '';
  const navGroups = useMemo(() => getNavForRole(role), [role]);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const set = new Set<string>();
    if (navGroups[0]) set.add(navGroups[0].title);
    const roleDefaults: Record<string, string[]> = {
      director:     ["Ta'lim", 'Moliya', 'Analitika'],
      super_admin:  ["Ta'lim", 'Moliya'],
      branch_admin: ["Ta'lim", 'Operatsiyalar'],
      teacher:      ['Sinflarim'],
      class_teacher:['Sinflarim'],
    };
    (roleDefaults[role] ?? []).forEach((t) => {
      if (navGroups.find((g) => g.title === t)) set.add(t);
    });
    navGroups.forEach((g) => {
      if (g.items.some((item) => isNavActive(item, pathname))) set.add(g.title);
    });
    return set;
  });

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      navGroups.forEach((g) => {
        if (g.items.some((item) => isNavActive(item, pathname))) next.add(g.title);
      });
      return next;
    });
  }, [pathname, navGroups]);

  const toggleGroup = (title: string) =>
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });

  return (
    <aside className={cn(
      'group/sidebar relative flex h-screen shrink-0 flex-col xedu-material-sidebar transition-[width] duration-[var(--xedu-duration)] ease-out',
      sidebarCollapsed ? 'w-[84px]' : 'w-[272px]',
    )}>

      {/* ── Logo ──────────────────────────────────────────────────────── */}
      <div className={cn(
        'relative flex h-16 shrink-0 items-center border-b border-leaf/10 dark:border-leaf/10',
        sidebarCollapsed ? 'justify-center px-2' : 'px-4',
      )}>
        <Link href="/dashboard" className="flex items-center gap-2.5 transition-opacity duration-150">
          <img
            src="/icon.png"
            alt="Xedu"
            className={cn('object-contain shrink-0', sidebarCollapsed ? 'h-8 w-8' : 'h-7 w-7')}
          />
          {!sidebarCollapsed && (
            <span className="text-base font-black tracking-tight text-leaf-deep dark:text-leaf">
              Xedu
            </span>
          )}
        </Link>

        <button
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Kengaytirish' : "Yig'ish"}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2',
            'flex h-6 w-6 items-center justify-center rounded-lg',
            'text-leaf-deep/40 transition-all duration-150',
            'hover:bg-leaf/12 hover:text-leaf-deep dark:text-leaf/30 dark:hover:bg-leaf/20 dark:hover:text-leaf',
          )}
        >
          {sidebarCollapsed
            ? <ChevronRight className="h-3.5 w-3.5" />
            : <ChevronLeft  className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 scrollbar-sidebar">
        {navGroups.map((group, idx) => {
          const expanded    = expandedGroups.has(group.title);
          const canCollapse = idx > 0;
          return (
            <div key={group.title}>
              <GroupHeader
                title={group.title}
                collapsed={sidebarCollapsed}
                expanded={expanded}
                onToggle={canCollapse && !sidebarCollapsed ? () => toggleGroup(group.title) : undefined}
              />
              {(sidebarCollapsed || expanded) && (
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <NavLink key={item.href} item={item} pathname={pathname} collapsed={sidebarCollapsed} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-leaf/10 py-2 dark:border-leaf/10">
        <BranchContext collapsed={sidebarCollapsed} />
        <ProfileFooter collapsed={sidebarCollapsed} />
      </div>
    </aside>
  );
}
