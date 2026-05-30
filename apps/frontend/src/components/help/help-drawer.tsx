'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { X } from 'lucide-react';
import { HelpArticleRenderer } from './help-article-renderer';
import { useHelp } from './help-provider';

export function HelpDrawer() {
  const { isOpen, closeHelp } = useHelp();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) closeHelp(); }}>
      <SheetContent hideClose className="w-[420px] sm:w-[460px] overflow-y-auto p-0">
        <SheetHeader className="flex flex-row items-center justify-between px-5 py-3 border-b border-border/50 shrink-0">
          <SheetTitle className="text-base font-semibold">Yordam</SheetTitle>
          <SheetClose className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center">
            <X className="h-4 w-4" />
          </SheetClose>
        </SheetHeader>
        <div className="px-4 py-3">
          <HelpArticleRenderer />
        </div>
      </SheetContent>
    </Sheet>
  );
}
