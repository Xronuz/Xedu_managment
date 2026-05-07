import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[96px] w-full rounded-lg px-3.5 py-2.5 text-sm',
          'bg-white dark:bg-xedu-slate-900',
          'border border-xedu-slate-200 dark:border-xedu-slate-700 shadow-pill',
          'transition-all duration-150',
          'placeholder:text-xedu-slate-400 dark:placeholder:text-xedu-slate-500',
          'ring-offset-white dark:ring-offset-xedu-slate-900',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xedu-primary/30 focus-visible:border-xedu-primary',
          'hover:border-xedu-slate-300 dark:hover:border-xedu-slate-600',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-xedu-slate-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
