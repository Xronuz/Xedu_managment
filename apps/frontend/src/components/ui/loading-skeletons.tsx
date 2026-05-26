import { Skeleton } from '@/components/ui/skeleton';

/** Standard page skeleton with header + stats + content grid */
export function PageSkeleton({ statsCount = 4 }: { statsCount?: number }) {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(statsCount)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-xedu-bg-elevated p-4 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Content area */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-xedu-bg-elevated p-4 space-y-3">
          <Skeleton className="h-5 w-36" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-xedu-bg-elevated p-4 space-y-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/** Table skeleton with header + N rows */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 rounded-xl border bg-xedu-bg-elevated p-4">
      <div className="flex items-center justify-between pb-2 border-b">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="space-y-2">
        {/* Header row */}
        <div className="flex gap-2 pb-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={`h-${i}`} className="h-4 flex-1" />
          ))}
        </div>
        {/* Data rows */}
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex gap-2">
            {[...Array(4)].map((_, j) => (
              <Skeleton key={`${i}-${j}`} className="h-10 flex-1 rounded-md" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Card grid skeleton with N cards */
export function CardGridSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(cards)].map((_, i) => (
        <div key={i} className="rounded-xl border bg-xedu-bg-elevated p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** Simple list skeleton */
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(items)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}
