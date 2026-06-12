import { cn } from '@/lib/utils';

/**
 * Xedu Skeleton — Calm loading placeholder
 *
 * Rules:
 * - Subtle shimmer, low contrast
 * - No flashy animations
 * - Matches final layout shapes
 * - Preserves layout stability
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-xedu-slate-100 dark:bg-xedu-slate-800',
        className,
      )}
      {...props}
    />
  );
}

/* ── Layout-preserving skeleton presets ───────────────────────────────────── */

export function SkeletonStatCard() {
  return (
    <div className="rounded-2xl border border-xedu-border bg-xedu-bg-panel p-6 dark:bg-xedu-bg-panel">
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-10 w-10 rounded-2xl" />
      </div>
      <Skeleton className="h-10 w-28 mb-3" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-black/[0.04] dark:border-white/[0.05]">
      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5 min-w-0">
        <Skeleton className="h-3.5 w-1/3 max-w-[200px]" />
        <Skeleton className="h-3 w-1/4 max-w-[140px]" />
      </div>
      {Array.from({ length: cols - 2 }).map((_, i) => (
        <Skeleton key={i} className="h-3.5 w-16 shrink-0" />
      ))}
    </div>
  );
}

export function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-xedu-slate-50 last:border-b-0">
      <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-3.5 w-16" />
    </div>
  );
}

export { Skeleton };
