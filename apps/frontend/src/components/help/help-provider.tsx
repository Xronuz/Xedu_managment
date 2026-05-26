'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface HelpArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  faq: { q: string; a: string }[];
}

export interface HelpContent {
  articles: HelpArticle[];
  shortcuts: { keys: string[]; description: string }[];
}

interface HelpContextValue {
  isOpen: boolean;
  currentArticleId: string | null;
  openHelp: (articleId?: string) => void;
  closeHelp: () => void;
  setCurrentArticle: (id: string | null) => void;
  content: HelpContent;
  currentPageArticle: HelpArticle | null;
}

const HelpContext = createContext<HelpContextValue | null>(null);

function useKeyboardShortcut(callback: () => void, keys: string[]) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const keySet = new Set(keys.map(k => k.toLowerCase()));
      const pressed = new Set<string>();
      if (e.metaKey || e.ctrlKey) pressed.add('cmd');
      if (e.shiftKey) pressed.add('shift');
      if (e.altKey) pressed.add('alt');
      pressed.add(e.key.toLowerCase());

      if (
        keySet.size === pressed.size &&
        Array.from(keySet).every(k => pressed.has(k))
      ) {
        e.preventDefault();
        callback();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [callback, keys]);
}

// Page-specific article mapping
const PAGE_ARTICLES: Record<string, string> = {
  '/dashboard/ops': 'ops-command-center',
  '/dashboard/setup': 'setup-wizard',
  '/dashboard/schedule': 'timetable',
  '/dashboard/teaching-loads': 'teaching-loads',
  '/dashboard/payroll': 'payroll',
  '/dashboard/attendance': 'attendance',
  '/dashboard/teacher-substitutions': 'substitutions',
  '/dashboard/reports': 'analytics',
  '/dashboard/analytics/timetable': 'analytics',
};

export function HelpProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentArticleId, setCurrentArticleId] = useState<string | null>(null);
  const [content, setContent] = useState<HelpContent>({ articles: [], shortcuts: [] });

  // Load help content
  useEffect(() => {
    import('@/content/help/uz.json').then((mod) => {
      setContent(mod.default as HelpContent);
    });
  }, []);

  const openHelp = useCallback((articleId?: string) => {
    setCurrentArticleId(articleId ?? null);
    setIsOpen(true);
  }, []);

  const closeHelp = useCallback(() => {
    setIsOpen(false);
  }, []);

  const setCurrentArticle = useCallback((id: string | null) => {
    setCurrentArticleId(id);
  }, []);

  // Detect current page article
  const currentPageArticle = content.articles.find(a => a.id === currentArticleId) ?? null;

  // Keyboard shortcut: Cmd/Ctrl + Shift + ?
  useKeyboardShortcut(() => {
    setIsOpen(prev => !prev);
  }, ['cmd', 'shift', '?']);

  return (
    <HelpContext.Provider
      value={{
        isOpen,
        currentArticleId,
        openHelp,
        closeHelp,
        setCurrentArticle,
        content,
        currentPageArticle,
      }}
    >
      {children}
    </HelpContext.Provider>
  );
}

export function useHelp() {
  const ctx = useContext(HelpContext);
  if (!ctx) throw new Error('useHelp must be used within HelpProvider');
  return ctx;
}

export { PAGE_ARTICLES };
