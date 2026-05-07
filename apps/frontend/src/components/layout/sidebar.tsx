'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, GraduationCap, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useBranchStore } from '@/store/branch.store';
import { useUIStore } from '@/store/ui.store';
import { getNavForRole } from '@/config/navigation';
import type { NavItem } from '@/config/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/* ────────────────────────────────────────────────────────────────────────────
   Xedu Sidebar — Institutional, workflow-based navigation

   Width:      272px expanded | 84px collapsed
   Philosophy: Calm, authoritative, spatially consistent.
   Motion:     150ms ease (tokenized)
   ──────────────────────────────────────────────────────────────────────────── */

function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.[0] ?? '';
  const l = lastName?.[0] ?? '';
  return (f + l).toUpperCase() || 'U';
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    director:       'Direktor',
    vice_principal: "O'rinbosar",
    branch_admin:   'Filial admin',
    teacher:        "O'qituvchi",
    class_teacher:  'Sinf rahbari',
    accountant:     'Buxgalter',
    librarian:      'Kutubxonachi',
    student:        "O'quvchi",
    parent:         'Ota-ona',
    super_admin:    'Super Admin',
  };
  return map[role] ?? role;
}

/* ── Nav Item Component ──────────────────────────────────────────────────── */

function NavLink({
  item,
  pathname,
  collapsed,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
}) {
  const isActive = isNavActive(item, pathname);

  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-[colors,background-color] duration-[var(--xedu-duration)]',
        collapsed ? 'justify-center px-2' : 'px-3',
        isActive
          ? 'bg-xedu-primary-light text-xedu-primary'
          : 'text-xedu-slate-600 hover:bg-xedu-slate-50 hover:text-xedu-slate-900',
      )}
      title={collapsed ? item.label : undefined}
    >
      {/* Active left indicator — 2px solid primary, only when expanded */}
      {isActive && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-r-full bg-xedu-primary" />
      )}

      <Icon
        className={cn(
          'shrink-0 transition-colors duration-[var(--xedu-duration)]',
          isActive ? 'text-xedu-primary' : 'text-xedu-slate-400 group-hover:text-xedu-slate-600',
          collapsed ? 'h-5 w-5' : 'h-[18px] w-[18px]',
        )}
        strokeWidth={1.8}
      />

      {!collapsed && (
        <span className="truncate">{item.label}</span>
      )}
    </Link>
  );
}

/* ── Nav active helper ───────────────────────────────────────────────────── */
function isNavActive(item: NavItem, pathname: string): boolean {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + '/');
}

/* ── Group Header ────────────────────────────────────────────────────────── */

function GroupHeader({
  title,
  collapsed,
  expanded,
  onToggle,
}: {
  title: string;
  collapsed: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  if (collapsed) {
    return (
      <div className="my-2 flex justify-center">
        <div className="h-px w-8 bg-xedu-slate-200 dark:bg-xedu-slate-700" />
      </div>
    );
  }
  return (
    <button
      onClick={onToggle}
      className={cn(
        'mb-1 mt-3.5 flex w-full items-center justify-between px-3 py-1 text-2xs font-semibold uppercase tracking-wider transition-colors',
        onToggle ? 'cursor-pointer hover:text-xedu-slate-600' : 'cursor-default',
        expanded ? 'text-xedu-slate-500' : 'text-xedu-slate-400',
      )}
    >
      <span>{title}</span>
      {onToggle && (
        <ChevronDown
          className={cn(
            'h-3 w-3 shrink-0 transition-transform duration-[var(--xedu-duration)]',
            expanded ? 'rotate-0' : '-rotate-90',
          )}
        />
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
      <div className="flex justify-center py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-xedu-slate-100">
          <GraduationCap className="h-4 w-4 text-xedu-slate-500" strokeWidth={1.8} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-2 rounded-lg bg-xedu-slate-50 px-3 py-2.5">
      <p className="text-2xs font-semibold uppercase tracking-wider text-xedu-slate-400">
        Filial
      </p>
      <p className="mt-0.5 truncate text-xs font-medium text-xedu-slate-800">
        {branchName}
      </p>
    </div>
  );
}

/* ── Profile Footer ──────────────────────────────────────────────────────── */

function ProfileFooter({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuthStore();
  if (!user) return null;

  const initials = getInitials(user.firstName, user.lastName);
  const displayName = `${user.firstName} ${user.lastName}`.trim() || user.email;

  if (collapsed) {
    return (
      <div className="flex justify-center py-3">
        <Avatar className="h-8 w-8 ring-2 ring-xedu-slate-100">
          <AvatarImage src={user.avatarUrl ?? undefined} />
          <AvatarFallback className="bg-xedu-slate-100 text-xs font-semibold text-xedu-slate-600">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5">
      <Avatar className="h-8 w-8 shrink-0 ring-2 ring-xedu-slate-100">
        <AvatarImage src={user.avatarUrl ?? undefined} />
        <AvatarFallback className="bg-xedu-slate-100 text-xs font-semibold text-xedu-slate-600">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-xedu-slate-900">
          {displayName}
        </p>
        <p className="truncate text-2xs text-xedu-slate-500">
          {roleLabel(user.role)}
        </p>
      </div>
    </div>
  );
}

/* ── Sidebar Export ──────────────────────────────────────────────────────── */

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [logoHovered, setLogoHovered] = useState(false);

  const role = user?.role ?? '';
  const navGroups = useMemo(() => getNavForRole(role), [role]);

  // ── Collapsible groups ──
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const set = new Set<string>();
    // 1. Always keep Overview open
    if (navGroups[0]) set.add(navGroups[0].title);

    // 2. Role-based defaults
    const roleDefaults: Record<string, string[]> = {
      director:       ["Ta'lim", 'Moliya', 'Analitika'],
      super_admin:    ["Ta'lim", 'Moliya', 'Analitika'],
      branch_admin:   ["Ta'lim", 'Operatsiyalar'],
      teacher:        ['Sinflarim'],
      class_teacher:  ['Sinflarim'],
    };
    const defaults = roleDefaults[role] ?? [];
    navGroups.forEach((g) => {
      if (defaults.includes(g.title)) set.add(g.title);
    });

    // 3. Keep active route's parent group open
    navGroups.forEach((g) => {
      if (g.items.some((item) => isNavActive(item, pathname))) {
        set.add(g.title);
      }
    });

    return set;
  });

  // Auto-expand when route changes
  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      navGroups.forEach((g) => {
        if (g.items.some((item) => isNavActive(item, pathname))) {
          next.add(g.title);
        }
      });
      return next;
    });
  }, [pathname, navGroups]);

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  return (
    <aside
      className={cn(
        'relative flex h-screen shrink-0 flex-col border-r border-xedu-slate-100 bg-white transition-[width] duration-[var(--xedu-duration)] ease-out dark:border-xedu-slate-800 dark:bg-xedu-slate-900',
        sidebarCollapsed ? 'w-[84px]' : 'w-[272px]',
      )}
    >
      {/* ── Logo Area ───────────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-xedu-slate-100 dark:border-xedu-slate-800',
          sidebarCollapsed ? 'justify-center px-2' : 'px-4',
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-2.5 transition-opacity duration-[var(--xedu-duration)]',
            sidebarCollapsed ? 'justify-center' : '',
          )}
          onMouseEnter={() => setLogoHovered(true)}
          onMouseLeave={() => setLogoHovered(false)}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-xedu-primary">
            <GraduationCap className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          {!sidebarCollapsed && (
            <span
              className={cn(
                'text-lg font-bold tracking-tight text-xedu-slate-900 transition-colors duration-[var(--xedu-duration)] dark:text-white',
                logoHovered && 'text-xedu-primary',
              )}
            >
              Xedu
            </span>
          )}
        </Link>
      </div>

      {/* ── Branch Context ──────────────────────────────────────────────── */}
      <div className="shrink-0 pt-3">
        <BranchContext collapsed={sidebarCollapsed} />
      </div>

      {/* ── Navigation Scroll Area ──────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1 scrollbar-sidebar">
        {navGroups.map((group, groupIndex) => {
          const isExpanded = expandedGroups.has(group.title);
          const canCollapse = groupIndex > 0; // Overview never collapses
          return (
            <div key={group.title}>
              <GroupHeader
                title={group.title}
                collapsed={sidebarCollapsed}
                expanded={isExpanded}
                onToggle={canCollapse && !sidebarCollapsed ? () => toggleGroup(group.title) : undefined}
              />
              {(sidebarCollapsed || isExpanded) && (
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      collapsed={sidebarCollapsed}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Footer: Profile + Toggle ────────────────────────────────────── */}
      <div className="shrink-0 border-t border-xedu-slate-100 dark:border-xedu-slate-800">
        <ProfileFooter collapsed={sidebarCollapsed} />

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className={cn(
            'flex w-full items-center gap-2 border-t border-xedu-slate-100 px-3 py-2.5 text-2xs font-medium text-xedu-slate-400 transition-colors hover:bg-xedu-slate-50 hover:text-xedu-slate-600 dark:border-xedu-slate-800',
            sidebarCollapsed ? 'justify-center' : 'justify-between',
          )}
          title={sidebarCollapsed ? 'Kengaytirish' : 'Yig\'ish'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <>
              <span>Yig&apos;ish</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
