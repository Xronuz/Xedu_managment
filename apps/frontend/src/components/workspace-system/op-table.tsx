'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CheckSquare, Square, ArrowUpDown } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════════
   OPERATIONAL TABLE (OpTable)
   Xedu-standardized table for all operational lists.

   Features:
   - Density presets (compact / normal / spacious)
   - Row selection with checkboxes
   - Hover-reveal inline actions
   - Status signal dots/badges
   - Sticky header
   - Sort indicators
   - Empty state
   - Loading skeletons

   Reference: Linear + SAP + Airtable Enterprise density
   ═══════════════════════════════════════════════════════════════════════════════ */

export type TableDensity = 'compact' | 'normal' | 'spacious';
export type RowTone = 'neutral' | 'attention' | 'urgent' | 'success' | 'muted';

export interface OpColumn<T> {
  key: string;
  header: string;
  width?: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  cell: (row: T, index: number) => React.ReactNode;
}

export interface OpTableProps<T> {
  columns: OpColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  density?: TableDensity;
  selectable?: boolean;
  selectedIds?: string[];
  onSelect?: (id: string) => void;
  onSelectAll?: () => void;
  sortKey?: string | null;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  rowTone?: (row: T) => RowTone;
  rowHref?: (row: T) => string | undefined;
  rowActions?: (row: T) => React.ReactNode;
  isLoading?: boolean;
  skeletonRows?: number;
  emptyState?: React.ReactNode;
  className?: string;
  maxHeight?: string;
}

export function OpTable<T>({
  columns,
  rows,
  rowKey,
  density = 'compact',
  selectable = false,
  selectedIds = [],
  onSelect,
  onSelectAll,
  sortKey,
  sortDir,
  onSort,
  rowTone,
  rowHref,
  rowActions,
  isLoading,
  skeletonRows = 5,
  emptyState,
  className,
  maxHeight,
}: OpTableProps<T>) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.includes(rowKey(r)));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const densityPadding = {
    compact: 'px-3 py-1.5',
    normal: 'px-4 py-2.5',
    spacious: 'px-5 py-3.5',
  }[density];

  const densityText = {
    compact: 'text-xs',
    normal: 'text-sm',
    spacious: 'text-base',
  }[density];

  if (isLoading) {
    return (
      <div className={cn('rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 overflow-hidden', className)}>
        <div className="divide-y divide-xedu-slate-100 dark:divide-xedu-slate-800">
          {[...Array(skeletonRows)].map((_, i) => (
            <div key={i} className={cn('animate-pulse bg-xedu-slate-50 dark:bg-xedu-slate-800/30', densityPadding)}>
              <div className="h-4 bg-xedu-slate-200 dark:bg-xedu-slate-700 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (rows.length === 0 && emptyState) {
    return (
      <div className={cn('rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 overflow-hidden', className)}>
        {emptyState}
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 overflow-hidden bg-white dark:bg-xedu-slate-900', className)}>
      <div className={cn('overflow-x-auto', maxHeight && 'overflow-y-auto')} style={maxHeight ? { maxHeight } : undefined}>
        <table className="w-full text-left">
          <thead className="sticky top-0 z-10 bg-xedu-slate-50/80 dark:bg-xedu-slate-800/80 backdrop-blur-sm">
            <tr className="border-b border-xedu-slate-100 dark:border-xedu-slate-800">
              {selectable && (
                <th className={cn('w-10', densityPadding)}>
                  <button
                    type="button"
                    onClick={onSelectAll}
                    className="flex items-center justify-center"
                    aria-label={allSelected ? "Barchasini bekor qilish" : "Barchasini tanlash"}
                  >
                    {allSelected ? (
                      <CheckSquare className="h-4 w-4 text-xedu-primary" />
                    ) : someSelected ? (
                      <div className="h-4 w-4 rounded-sm border-2 border-xedu-primary bg-xedu-primary-light relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-0.5 w-2 bg-xedu-primary rounded-full" />
                        </div>
                      </div>
                    ) : (
                      <Square className="h-4 w-4 text-xedu-slate-300" />
                    )}
                  </button>
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    densityPadding,
                    'text-2xs font-bold uppercase tracking-[0.12em] text-xedu-slate-500 whitespace-nowrap',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right',
                    col.sortable && 'cursor-pointer hover:text-xedu-slate-700 transition-colors select-none'
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable && onSort?.(col.key)}
                  aria-sort={col.sortable ? (sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <ArrowUpDown className={cn(
                        'h-3 w-3 transition-colors',
                        sortKey === col.key ? 'text-xedu-primary' : 'text-xedu-slate-300'
                      )} />
                    )}
                  </span>
                </th>
              ))}
              {rowActions && <th className={cn('w-0', densityPadding)} />}
            </tr>
          </thead>
          <tbody className="divide-y divide-xedu-slate-100 dark:divide-xedu-slate-800">
            {rows.map((row, idx) => {
              const key = rowKey(row);
              const tone = rowTone?.(row) ?? 'neutral';
              const isSelected = selectedIds.includes(key);
              const isHovered = hoveredRow === key;
              const href = rowHref?.(row);

              const toneBg = {
                neutral: '',
                attention: 'bg-amber-50/40 dark:bg-amber-900/10',
                urgent: 'bg-red-50/40 dark:bg-red-900/10',
                success: 'bg-xedu-primary-light/20 dark:bg-xedu-primary/10',
                muted: 'opacity-60',
              }[tone];

              return (
                <tr
                  key={key}
                  className={cn(
                    'group transition-colors touch-manipulation',
                    toneBg,
                    isSelected && 'bg-xedu-primary-light/30',
                    !isSelected && 'hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/30',
                    href && 'cursor-pointer'
                  )}
                  onClick={() => href && (window.location.href = href)}
                  onMouseEnter={() => setHoveredRow(key)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {selectable && (
                    <td className={cn(densityPadding, 'w-10')} onClick={(e) => e.preventDefault()}>
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelect?.(key); }}
                        className="flex items-center justify-center"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-xedu-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-xedu-slate-300" />
                        )}
                      </button>
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        densityPadding,
                        densityText,
                        'text-xedu-slate-800 dark:text-xedu-slate-200',
                        col.align === 'center' && 'text-center',
                        col.align === 'right' && 'text-right'
                      )}
                    >
                      {col.cell(row, idx)}
                    </td>
                  ))}
                  {rowActions && (
                    <td className={cn(densityPadding, 'w-0')}>
                      <div className={cn(
                        'flex items-center gap-1 transition-opacity',
                        'opacity-100',
                        'md:opacity-0 md:group-hover:opacity-100',
                        (isHovered || isSelected) && 'md:opacity-100'
                      )}>
                        {rowActions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
