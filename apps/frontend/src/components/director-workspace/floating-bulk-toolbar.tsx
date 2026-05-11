'use client';

import { useEffect, useCallback } from 'react';
import { X, CheckCircle2, XCircle, FileDown, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BulkAction {
  id: string;
  label: string;
  icon?: React.ElementType;
  onClick: (ids: string[]) => void;
  tone?: 'primary' | 'danger' | 'neutral';
  disabled?: boolean;
}

interface FloatingBulkToolbarProps {
  selectedIds: string[];
  actions: BulkAction[];
  onClear: () => void;
  visible: boolean;
}

export function FloatingBulkToolbar({
  selectedIds,
  actions,
  onClear,
  visible,
}: FloatingBulkToolbarProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClear();
    },
    [onClear]
  );

  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, handleKeyDown]);

  if (!visible || selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-xl mb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center gap-1 rounded-xl bg-xedu-bg-floating dark:bg-xedu-bg-floating border border-xedu-border-strong shadow-premium-lg px-2 py-1.5">
        {/* Count */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-r border-xedu-slate-100 dark:border-xedu-slate-800 shrink-0">
          <span className="text-sm font-bold text-xedu-slate-900 dark:text-xedu-slate-100 tabular-nums">
            {selectedIds.length}
          </span>
          <span className="text-xs font-medium text-xedu-slate-500">
            ta tanlandi
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 flex-1 overflow-x-auto scrollbar-hide">
          {actions.map((action) => {
            const Icon = action.icon;
            const toneColor =
              action.tone === 'danger'
                ? 'text-xedu-ruby-600 hover:text-xedu-ruby-700 hover:bg-xedu-ruby-50 dark:hover:bg-xedu-ruby-900/20'
                : action.tone === 'primary'
                ? 'text-xedu-primary hover:text-xedu-primary-hover hover:bg-xedu-primary-light/40'
                : 'text-xedu-slate-600 hover:text-xedu-slate-800 hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800';

            return (
              <button
                key={action.id}
                onClick={() => action.onClick(selectedIds)}
                disabled={action.disabled}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors shrink-0 min-h-[44px]',
                  toneColor,
                  action.disabled && 'opacity-40 cursor-not-allowed'
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{action.label}</span>
              </button>
            );
          })}
        </div>

        {/* Clear */}
        <button
          onClick={onClear}
          className="flex items-center gap-1 rounded-lg px-3 py-2.5 text-xs font-semibold text-xedu-slate-400 hover:text-xedu-slate-600 hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800 transition-colors shrink-0 min-h-[44px]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
