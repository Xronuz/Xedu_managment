import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-xedu-primary/30 focus:ring-offset-2 select-none',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-xedu-primary text-white hover:bg-xedu-primary-hover',
        secondary:
          'border-transparent bg-xedu-slate-100 text-xedu-slate-900 hover:bg-xedu-slate-200 dark:bg-xedu-slate-800 dark:text-xedu-slate-100 dark:hover:bg-xedu-slate-700',
        destructive:
          'border-transparent bg-xedu-ruby/10 text-xedu-ruby border-xedu-ruby/15 dark:bg-xedu-ruby/20 dark:border-xedu-ruby/25',
        outline:
          'border-xedu-slate-200 text-xedu-slate-700 bg-white dark:border-xedu-slate-700 dark:text-xedu-slate-200 dark:bg-xedu-slate-900',

        /* ── Semantic status variants (limited palette) ── */
        success:
          'border-transparent bg-xedu-primary-light text-xedu-primary dark:bg-xedu-primary/20 dark:text-xedu-primary',
        warning:
          'border-transparent bg-xedu-amber/10 text-xedu-amber dark:bg-xedu-amber/15 dark:text-xedu-amber',
        info:
          'border-transparent bg-xedu-sky/10 text-xedu-sky dark:bg-xedu-sky/15 dark:text-xedu-sky',
        violet:
          'border-transparent bg-xedu-violet/10 text-xedu-violet dark:bg-xedu-violet/15 dark:text-xedu-violet',
        ruby:
          'border-transparent bg-xedu-ruby/10 text-xedu-ruby dark:bg-xedu-ruby/15 dark:text-xedu-ruby',
        gold:
          'border-transparent bg-xedu-gold/10 text-xedu-gold dark:bg-xedu-gold/15 dark:text-xedu-gold',

        /* ── Subtle tinted variants — no border ── */
        'outline-success':
          'border-transparent text-xedu-primary bg-xedu-primary-light dark:text-xedu-primary dark:bg-xedu-primary/15',
        'outline-warning':
          'border-transparent text-xedu-amber bg-xedu-amber/10 dark:text-xedu-amber dark:bg-xedu-amber/15',
        'outline-destructive':
          'border-transparent text-xedu-ruby bg-xedu-ruby/10 dark:text-xedu-ruby dark:bg-xedu-ruby/15',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
