'use client';

import { cn } from '@/lib/utils';
import { Button } from './button';
import React from 'react';

interface StandardEmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function StandardEmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: StandardEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-14 text-center',
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800">
          <Icon className="h-8 w-8 text-xedu-slate-400 dark:text-xedu-slate-500 opacity-50" />
        </div>
      )}
      <p className="font-semibold text-xedu-slate-900 dark:text-xedu-slate-100">
        {title}
      </p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-xedu-slate-500 dark:text-xedu-slate-400">
          {description}
        </p>
      )}
      <div className="mt-5 flex items-center gap-2">
        {primaryAction && (
          <Button size="sm" onClick={primaryAction.onClick}>
            {primaryAction.label}
          </Button>
        )}
        {secondaryAction && (
          <Button variant="outline" size="sm" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}
