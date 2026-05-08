'use client';

import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════════════════════════
   WORKSPACE SHELL
   Standardized layout zones for all operational pages.

   Zones:
   - Header zone: page title, breadcrumbs, primary actions
   - Toolbar zone: filters, search, secondary actions, view toggle
   - Main zone: primary content (tables, lists, canvases)
   - Sidebar zone: contextual intelligence, secondary info
   - Panel zone: slide-over contextual detail
   - Bottom zone: floating actions, bulk bars, pagination

   Usage:
   <WorkspaceShell>
     <WorkspaceHeader title="Filiallar" actions={<Button>Yaratish</Button>} />
     <WorkspaceToolbar>
       <SearchInput />
       <FilterChips />
     </WorkspaceToolbar>
     <WorkspaceMain>
       <OpTable ... />
     </WorkspaceMain>
     <WorkspaceSidebar>
       <IntelligenceFeed ... />
     </WorkspaceSidebar>
   </WorkspaceShell>
   ═══════════════════════════════════════════════════════════════════════════════ */

interface WorkspaceShellProps {
  children: React.ReactNode;
  className?: string;
  layout?: 'single' | 'two-column' | 'three-column' | 'fullscreen';
  density?: 'compact' | 'normal' | 'spacious';
}

export function WorkspaceShell({
  children,
  className,
  layout = 'two-column',
  density = 'compact',
}: WorkspaceShellProps) {
  const densityClass = {
    compact: 'space-y-3',
    normal: 'space-y-5',
    spacious: 'space-y-7',
  }[density];

  const layoutClass = {
    single: 'flex flex-col',
    'two-column': 'flex flex-col lg:flex-row lg:flex-wrap gap-4',
    'three-column': 'flex flex-col xl:flex-row xl:flex-wrap gap-4',
    fullscreen: 'flex flex-col h-[calc(100vh-var(--header-height,60px))]',
  }[layout];

  return (
    <div className={cn('relative pb-20 md:pb-6', densityClass, layoutClass, className)}>
      {children}
    </div>
  );
}

/* ── Header Zone ────────────────────────────────────────────────────────────── */

interface WorkspaceHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  className?: string;
}

export function WorkspaceHeader({
  title,
  subtitle,
  icon,
  actions,
  breadcrumbs,
  className,
}: WorkspaceHeaderProps) {
  return (
    <div className={cn('min-w-0 flex-1', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 mb-1.5">
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} className="flex items-center gap-1">
              {idx > 0 && <span className="text-xedu-slate-300 text-xs">/</span>}
              {crumb.href ? (
                <a href={crumb.href} className="text-xs font-medium text-xedu-slate-500 hover:text-xedu-primary transition-colors">
                  {crumb.label}
                </a>
              ) : (
                <span className="text-xs font-medium text-xedu-slate-400">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon && <span className="shrink-0">{icon}</span>}
            <h1 className="text-3xl font-black tracking-tight leading-none text-xedu-slate-900 dark:text-xedu-slate-100">
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className="text-xs font-medium text-xedu-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Toolbar Zone ───────────────────────────────────────────────────────────── */

interface WorkspaceToolbarProps {
  children: React.ReactNode;
  className?: string;
  sticky?: boolean;
}

export function WorkspaceToolbar({ children, className, sticky = false }: WorkspaceToolbarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 flex-wrap',
        sticky && 'sticky top-0 z-10 py-2 bg-xedu-bg/90 dark:bg-xedu-slate-950/90 backdrop-blur-sm -mx-2 px-2',
        className
      )}
    >
      {children}
    </div>
  );
}

/* ── Main Zone ──────────────────────────────────────────────────────────────── */

interface WorkspaceMainProps {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
}

export function WorkspaceMain({ children, className, scrollable = false }: WorkspaceMainProps) {
  return (
    <div
      className={cn(
        'flex-1 min-w-0',
        scrollable && 'overflow-y-auto',
        className
      )}
    >
      {children}
    </div>
  );
}

/* ── Sidebar Zone ───────────────────────────────────────────────────────────── */

interface WorkspaceSidebarProps {
  children: React.ReactNode;
  className?: string;
  width?: 'narrow' | 'normal' | 'wide';
}

export function WorkspaceSidebar({ children, className, width = 'normal' }: WorkspaceSidebarProps) {
  const widthClass = {
    narrow: 'w-full lg:w-[260px]',
    normal: 'w-full lg:w-[300px] xl:w-[340px]',
    wide: 'w-full lg:w-[380px] xl:w-[420px]',
  }[width];

  return (
    <div className={cn('shrink-0 space-y-3', widthClass, className)}>
      {children}
    </div>
  );
}

/* ── Panel Zone (slide-over) ────────────────────────────────────────────────── */

interface WorkspacePanelProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function WorkspacePanel({ open, onClose, children, className, title }: WorkspacePanelProps) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      {/* Panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white dark:bg-xedu-slate-900 shadow-xl border-l border-xedu-slate-100 dark:border-xedu-slate-800 transform transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
          'lg:absolute lg:inset-y-0 lg:right-0 lg:translate-x-0 lg:transition-none lg:shadow-none lg:border-l lg:w-[380px] lg:hidden',
          open && 'lg:block',
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-xedu-slate-100 dark:border-xedu-slate-800">
            <h3 className="text-sm font-bold text-xedu-slate-900 dark:text-xedu-slate-100">{title}</h3>
            <button
              onClick={onClose}
              className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-xedu-slate-100 dark:hover:bg-xedu-slate-800 transition-colors"
            >
              <span className="sr-only">Yopish</span>
              <svg className="h-4 w-4 text-xedu-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="h-[calc(100%-53px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}

/* ── Bottom Zone ────────────────────────────────────────────────────────────── */

interface WorkspaceBottomProps {
  children: React.ReactNode;
  className?: string;
}

export function WorkspaceBottom({ children, className }: WorkspaceBottomProps) {
  return (
    <div className={cn('fixed bottom-0 left-0 right-0 z-30 pointer-events-none', className)}>
      <div className="pointer-events-auto flex justify-center pb-4 px-4">
        {children}
      </div>
    </div>
  );
}

/* ── Section Block ──────────────────────────────────────────────────────────── */

interface WorkspaceSectionProps {
  title?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}

export function WorkspaceSection({
  title,
  icon,
  action,
  children,
  className,
  padded = true,
}: WorkspaceSectionProps) {
  return (
    <div className={cn('rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-white dark:bg-xedu-slate-900 overflow-hidden', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-xedu-slate-100 dark:border-xedu-slate-800">
          <div className="flex items-center gap-2">
            {icon && <span className="text-xedu-slate-500">{icon}</span>}
            {title && <h3 className="text-sm font-bold text-xedu-slate-900 dark:text-xedu-slate-100">{title}</h3>}
          </div>
          {action && <div className="flex items-center gap-1">{action}</div>}
        </div>
      )}
      <div className={cn(padded && 'px-3 py-2')}>{children}</div>
    </div>
  );
}
