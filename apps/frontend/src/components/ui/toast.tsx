'use client';

import * as React from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]',
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border p-4 pr-10 shadow-sm transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
  {
    variants: {
      variant: {
        default:   'border-xedu-slate-200 bg-white text-xedu-slate-900 dark:border-xedu-slate-700 dark:bg-xedu-slate-900 dark:text-xedu-slate-100',
        success:   'border-xedu-primary/20 bg-xedu-primary-light/60 text-xedu-slate-900 dark:border-xedu-primary/30 dark:bg-xedu-primary/10 dark:text-xedu-slate-100',
        warning:   'border-xedu-amber/20 bg-xedu-amber/5 text-xedu-slate-900 dark:border-xedu-amber/30 dark:bg-xedu-amber/10 dark:text-xedu-slate-100',
        destructive: 'border-xedu-ruby/20 bg-red-50 text-xedu-ruby dark:bg-[#2d0a0a] dark:text-red-200 dark:border-red-800/50',
        info:      'border-xedu-sky/20 bg-xedu-sky/5 text-xedu-slate-900 dark:border-xedu-sky/30 dark:bg-xedu-sky/10 dark:text-xedu-slate-100',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => (
  <ToastPrimitives.Root
    ref={ref}
    className={cn(toastVariants({ variant }), className)}
    {...props}
  />
));
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      'inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-xedu-slate-200 bg-transparent px-3 text-sm font-medium transition-colors hover:bg-xedu-slate-50 focus:outline-none focus:ring-2 focus:ring-xedu-primary/30 focus:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-xedu-ruby/20 group-[.destructive]:hover:border-xedu-ruby/30 group-[.destructive]:hover:bg-xedu-ruby group-[.destructive]:hover:text-white group-[.destructive]:focus:ring-xedu-ruby/30',
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'absolute right-3 top-3 rounded-lg p-1 text-xedu-slate-400 opacity-0 transition-opacity hover:text-xedu-slate-900 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-xedu-primary/30 group-hover:opacity-100 dark:text-xedu-slate-500 dark:hover:text-xedu-slate-200 group-[.destructive]:text-xedu-ruby/60 group-[.destructive]:hover:text-xedu-ruby group-[.destructive]:focus:ring-xedu-ruby/30',
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn('text-sm font-semibold', className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('text-sm opacity-80', className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

/* ── Semantic icon helper ─────────────────────────────────────────────────── */

function ToastIcon({ variant }: { variant?: string }) {
  const map: Record<string, React.ReactNode> = {
    success:     <CheckCircle2 className="h-5 w-5 text-xedu-primary shrink-0 mt-0.5" />,
    warning:     <AlertTriangle className="h-5 w-5 text-xedu-amber shrink-0 mt-0.5" />,
    destructive: <AlertCircle className="h-5 w-5 text-xedu-ruby shrink-0 mt-0.5" />,
    info:        <Info className="h-5 w-5 text-xedu-sky shrink-0 mt-0.5" />,
  };
  return map[variant ?? ''] ?? null;
}

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;
type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  ToastIcon,
};
