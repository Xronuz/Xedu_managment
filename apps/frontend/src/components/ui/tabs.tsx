'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

/**
 * TabsList — floating white container with pill shadow.
 * Sits on the slate canvas like a card; inner tabs are dark emphasis pills.
 */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-11 items-center justify-center gap-1 p-1',
      'rounded-2xl bg-black/[0.04] dark:bg-white/[0.06]',
      'shadow-[var(--xedu-shadow-inset)]',
      'text-xedu-slate-500 dark:text-xedu-slate-400',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

/**
 * TabsTrigger — dark slate pill when active (matches primary CTA emphasis),
 * transparent-hover when passive.
 */
const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap',
      'rounded-xl px-4 py-1.5 text-sm font-medium',
      'ring-offset-white dark:ring-offset-xedu-slate-900 transition-all duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xedu-primary/30 focus-visible:ring-offset-0',
      'disabled:pointer-events-none disabled:opacity-50',
      // Passive
      'hover:text-xedu-slate-700 dark:hover:text-xedu-slate-200 hover:bg-white/60 dark:hover:bg-white/10',
      // Active
      'data-[state=active]:bg-white dark:data-[state=active]:bg-xedu-slate-700',
      'data-[state=active]:text-xedu-slate-800 dark:data-[state=active]:text-xedu-slate-100',
      'data-[state=active]:shadow-premium-sm',
      'data-[state=active]:font-semibold',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-4 ring-offset-white dark:ring-offset-xedu-slate-900',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xedu-primary/30 focus-visible:ring-offset-2',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
