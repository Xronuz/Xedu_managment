'use client';

import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export interface BulkAction<T> {
  label: string;
  icon: LucideIcon;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  onClick: (items: T[]) => void | Promise<void>;
  disabled?: (items: T[]) => boolean;
}

interface BulkActionBarProps<T> {
  selected: T[];
  actions: BulkAction<T>[];
  onClearSelection: () => void;
  itemLabel?: string;
}

export function BulkActionBar<T>({
  selected,
  actions,
  onClearSelection,
  itemLabel = 'ta element',
}: BulkActionBarProps<T>) {
  if (selected.length === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-xedu-bg-elevated px-4 py-2.5 shadow-sm animate-in slide-in-from-bottom-2">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {selected.length}
        </span>
        <span className="text-sm font-medium text-xedu-slate-600 dark:text-xedu-slate-400">
          {itemLabel} tanlandi
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {actions.map((action, i) => {
          const Icon = action.icon;
          const isDisabled = action.disabled ? action.disabled(selected) : false;
          return (
            <Button
              key={i}
              variant={action.variant ?? 'outline'}
              size="sm"
              className="h-8 gap-1.5"
              disabled={isDisabled}
              onClick={() => action.onClick(selected)}
            >
              <Icon className="h-3.5 w-3.5" />
              {action.label}
            </Button>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xedu-slate-500"
          onClick={onClearSelection}
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Tozalash
        </Button>
      </div>
    </div>
  );
}
