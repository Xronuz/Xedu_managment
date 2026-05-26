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
      <SheetContent className="w-[400px] sm:w-[440px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>Yordam</SheetTitle>
        </SheetHeader>
        <HelpArticleRenderer />
      </SheetContent>
    </Sheet>
  );
}
