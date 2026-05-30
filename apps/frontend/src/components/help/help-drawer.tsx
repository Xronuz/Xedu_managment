'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { HelpArticleRenderer } from './help-article-renderer';
import { useHelp } from './help-provider';

export function HelpDrawer() {
  const { isOpen, closeHelp } = useHelp();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) closeHelp(); }}>
      <SheetContent className="w-[420px] sm:w-[460px] overflow-y-auto p-0">
        <SheetHeader className="pb-3 border-b border-border/50">
          <SheetTitle className="text-lg font-semibold mb-0">Yordam</SheetTitle>
        </SheetHeader>
        <div className="px-5 py-4">
          <HelpArticleRenderer />
        </div>
      </SheetContent>
    </Sheet>
  );
}
