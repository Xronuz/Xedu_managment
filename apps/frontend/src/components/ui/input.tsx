import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-xl text-sm',
        'bg-xedu-bg-elevated border border-xedu-slate-200',
        'px-4 py-2',
        'shadow-xs',
        'transition-all duration-150',
        'placeholder:text-xedu-slate-400 dark:placeholder:text-xedu-slate-500',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xedu-primary/30 focus-visible:border-xedu-primary',
        'hover:border-xedu-slate-300',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-xedu-slate-50',
        'dark:bg-xedu-slate-800 dark:border-xedu-slate-700 dark:hover:border-xedu-slate-600',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
