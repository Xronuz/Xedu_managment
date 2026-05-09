'use client';

import { AlertTriangle, Trash2 } from 'lucide-react';
import { useConfirmStore } from '@/store/confirm.store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog';
import { Button } from './button';

export function ConfirmDialog() {
  const { open, title, description, confirmText, cancelText, variant, _onConfirm, _onCancel } =
    useConfirmStore();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) _onCancel(); }}>
      <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            {variant === 'destructive' ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-xedu-ruby/10 shrink-0">
                <Trash2 className="h-4 w-4 text-xedu-ruby" />
              </span>
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-xedu-amber/10 dark:bg-xedu-amber/15 shrink-0">
                <AlertTriangle className="h-4 w-4 text-xedu-amber" />
              </span>
            )}
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="pl-10 text-sm text-xedu-slate-500 dark:text-xedu-slate-400">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button variant="outline" onClick={_onCancel} className="w-full sm:w-auto">
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={_onConfirm}
            className="w-full sm:w-auto"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
