'use client';

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  ToastIcon,
} from './toast';
import { useToast } from './use-toast';

export function Toaster() {
  const { toasts } = useToast();
  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, variant, ...props }) => (
        <Toast key={id} variant={variant} {...props}>
          <ToastIcon variant={variant ?? undefined} />
          <div className="grid gap-0.5 flex-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport aria-live="polite" aria-label="Bildirishnomalar" />
    </ToastProvider>
  );
}
