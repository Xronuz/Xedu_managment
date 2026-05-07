import { cn } from '@/lib/utils';
import { Button } from './button';
import React from 'react';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {Icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800">
          <Icon className="h-8 w-8 text-xedu-slate-400 dark:text-xedu-slate-500 opacity-50" />
        </div>
      )}
      <p className="font-semibold text-xedu-slate-900 dark:text-xedu-slate-100">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-xedu-slate-500 dark:text-xedu-slate-400">{description}</p>
      )}
      {action && (
        <Button className="mt-4" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
