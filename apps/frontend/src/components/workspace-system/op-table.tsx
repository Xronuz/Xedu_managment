'use client';

import { useState, useMemo, useCallback, memo } from 'react';
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
   - Row memoization for scale readiness

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
  /** Render a card for each row on mobile (<md) instead of the horizontally-scrolling table */
  renderMobileCard?: (row: T, index: number) => React.ReactNode;
}

/* ── Static lookup tables (never recreated) ───────────────────────────────── */

const DENSITY_PADDING: Record<TableDensity, string> = {
  compact: 'px-3 py-1.5',
  normal: 'px-4 py-2.5',
  spacious: 'px-5 py-3.5',
};

const DENSITY_TEXT: Record<TableDensity, string> = {
  compact: 'text-xs',
  normal: 'text-sm',
  spacious: 'text-base',
};

const TONE_BG: Record<RowTone, string> = {
  neutral: '',
  attention: 'bg-xedu-amber-50/60 dark:bg-xedu-amber-900/15',
  urgent: 'bg-xedu-ruby-50/60 dark:bg-xedu-ruby-900/15',
  success: 'bg-xedu-emerald-50/60 dark:bg-xedu-emerald-900/15',
  muted: 'opacity-60',
};

const TONE_BORDER: Record<RowTone, string> = {
  neutral: '',
  attention: 'border-l-2 border-l-xedu-amber-400',
  urgent: 'border-l-2 border-l-xedu-ruby-400',
  success: 'border-l-2 border-l-xedu-emerald-400',
  muted: '',
};

/* ── Main component ───────────────────────────────────────────────────────── */

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
  renderMobileCard,
}: OpTableProps<T>) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const allSelected = useMemo(
    () => rows.length > 0 && rows.every((r) => selectedIds.includes(rowKey(r))),
    [rows, selectedIds, rowKey]
  );
  const someSelected = selectedIds.length > 0 && !allSelected;

  const densityPadding = DENSITY_PADDING[density];
  const densityText = DENSITY_TEXT[density];

  const handleMouseEnter = useCallback((key: string) => setHoveredRow(key), []);
  const handleMouseLeave = useCallback(() => setHoveredRow(null), []);

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
    <div className={cn('rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 overflow-hidden bg-xedu-bg-elevated', className)}>
      {renderMobileCard && (
        <div className="md:hidden divide-y divide-xedu-slate-100 dark:divide-xedu-slate-800">
          {rows.map((row, idx) => (
            <div key={rowKey(row)}>{renderMobileCard(row, idx)}</div>
          ))}
        </div>
      )}
      <div className={cn(renderMobileCard && 'hidden md:block', 'overflow-x-auto', maxHeight && 'overflow-y-auto')} style={maxHeight ? { maxHeight } : undefined}>
        <table className="w-full text-left">
          <thead className="sticky top-0 z-10 bg-xedu-slate-50 dark:bg-xedu-slate-800">
            <tr className="border-b border-xedu-slate-100 dark:border-xedu-slate-800">
              {selectable && (
                <th className={cn('w-10', densityPadding)}>
                  <button
                    type="button"
                    onClick={onSelectAll}
                    className="flex items-center justify-center min-h-[44px] min-w-[44px]"
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
            {rows.map((row, idx) => (
              <OpTableRow<T>
                key={rowKey(row)}
                row={row}
                index={idx}
                columns={columns}
                rowKeyFn={rowKey}
                densityPadding={densityPadding}
                densityText={densityText}
                selectable={selectable}
                selectedIds={selectedIds}
                onSelect={onSelect}
                rowTone={rowTone}
                rowHref={rowHref}
                rowActions={rowActions}
                hoveredRow={hoveredRow}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Memoized row component ───────────────────────────────────────────────── */

interface OpTableRowProps<T> {
  row: T;
  index: number;
  columns: OpColumn<T>[];
  rowKeyFn: (row: T) => string;
  densityPadding: string;
  densityText: string;
  selectable: boolean;
  selectedIds: string[];
  onSelect?: (id: string) => void;
  rowTone?: (row: T) => RowTone;
  rowHref?: (row: T) => string | undefined;
  rowActions?: (row: T) => React.ReactNode;
  hoveredRow: string | null;
  onMouseEnter: (key: string) => void;
  onMouseLeave: () => void;
}

const OpTableRow = memo(function OpTableRow<T>({
  row,
  index,
  columns,
  rowKeyFn,
  densityPadding,
  densityText,
  selectable,
  selectedIds,
  onSelect,
  rowTone,
  rowHref,
  rowActions,
  hoveredRow,
  onMouseEnter,
  onMouseLeave,
}: OpTableRowProps<T>) {
  const key = rowKeyFn(row);
  const tone = rowTone?.(row) ?? 'neutral';
  const isSelected = selectedIds.includes(key);
  const isHovered = hoveredRow === key;
  const href = rowHref?.(row);

  const toneBg = TONE_BG[tone];
  const toneBorder = TONE_BORDER[tone];

  const handleRowClick = useCallback(() => {
    if (href) window.location.href = href;
  }, [href]);

  const handleSelectClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(key);
  }, [onSelect, key]);

  return (
    <tr
      className={cn(
        'group transition-colors touch-manipulation',
        toneBg,
        toneBorder,
        isSelected && 'bg-xedu-primary-light/30',
        !isSelected && 'hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/30',
        href && 'cursor-pointer'
      )}
      onClick={handleRowClick}
      onMouseEnter={() => onMouseEnter(key)}
      onMouseLeave={onMouseLeave}
    >
      {selectable && (
        <td className={cn(densityPadding, 'w-10')} onClick={(e) => e.preventDefault()}>
          <button
            onClick={handleSelectClick}
            className="flex items-center justify-center min-h-[44px] min-w-[44px]"
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
          {col.cell(row, index)}
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
}) as <T>(props: OpTableRowProps<T>) => React.JSX.Element;
