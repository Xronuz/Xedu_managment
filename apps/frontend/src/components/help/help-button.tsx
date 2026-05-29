'use client';

import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHelp, PAGE_ARTICLES } from './help-provider';
import { usePathname } from 'next/navigation';

interface HelpButtonProps {
  /** Force a specific article instead of auto-detecting from pathname */
  articleId?: string;
  /** Only show on specific pages (default: all pages) */
  pages?: string[];
}

export function HelpButton({ articleId, pages }: HelpButtonProps) {
  const { openHelp } = useHelp();
  const pathname = usePathname();

  // Auto-detect article from pathname
  const detectedArticleId = articleId ?? PAGE_ARTICLES[pathname] ?? null;

  // If pages filter is provided, only show on those pages
  if (pages && !pages.some(p => pathname === p || pathname.startsWith(p))) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className="fixed bottom-6 right-20 z-40 h-12 w-12 rounded-full shadow-lg border-primary/20 bg-xedu-bg-elevated hover:bg-primary/5"
      onClick={() => openHelp(detectedArticleId ?? undefined)}
      aria-label="Yordam"
    >
      <HelpCircle className="h-5 w-5 text-primary" />
    </Button>
  );
}
