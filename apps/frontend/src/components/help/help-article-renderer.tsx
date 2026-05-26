'use client';

import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { HelpCircle, ChevronRight, Search, Clock, Tag } from 'lucide-react';
import { useHelp } from './help-provider';
import { cn } from '@/lib/utils';

const CATEGORY_LABELS: Record<string, string> = {
  ops: 'Operatsiya',
  setup: 'Sozlash',
  education: "Ta'lim",
  finance: 'Moliya',
  reports: 'Hisobotlar',
};

const CATEGORY_COLORS: Record<string, string> = {
  ops: 'bg-blue-500/10 text-blue-600 border-blue-200',
  setup: 'bg-purple-500/10 text-purple-600 border-purple-200',
  education: 'bg-green-500/10 text-green-600 border-green-200',
  finance: 'bg-amber-500/10 text-amber-600 border-amber-200',
  reports: 'bg-rose-500/10 text-rose-600 border-rose-200',
};

export function HelpArticleRenderer() {
  const {
    currentPageArticle,
    content,
    setCurrentArticle,
    recentArticleIds,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
  } = useHelp();

  const categories = useMemo(() => {
    const set = new Set<string>();
    content.articles.forEach((a) => set.add(a.category));
    return Array.from(set).sort();
  }, [content.articles]);

  const recentArticles = useMemo(() => {
    return recentArticleIds
      .map((id) => content.articles.find((a) => a.id === id))
      .filter(Boolean) as typeof content.articles;
  }, [recentArticleIds, content.articles]);

  const filteredArticles = useMemo(() => {
    let result = content.articles;
    if (activeCategory) {
      result = result.filter((a) => a.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          a.faq.some((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
      );
    }
    return result;
  }, [content.articles, activeCategory, searchQuery]);

  if (currentPageArticle) {
    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border',
                CATEGORY_COLORS[currentPageArticle.category] ?? 'bg-muted text-muted-foreground'
              )}
            >
              {CATEGORY_LABELS[currentPageArticle.category] ?? currentPageArticle.category}
            </span>
          </div>
          <h3 className="text-lg font-semibold">{currentPageArticle.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-xedu-slate-600 dark:text-xedu-slate-400">
            {currentPageArticle.content}
          </p>
        </div>

        {currentPageArticle.faq.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-xedu-slate-500 uppercase tracking-wider">
              Ko&apos;p so&apos;raladigan savollar
            </h4>
            <div className="space-y-2">
              {currentPageArticle.faq.map((item, i) => (
                <div key={i} className="rounded-lg border bg-xedu-bg-elevated p-3">
                  <p className="text-sm font-medium">{item.q}</p>
                  <p className="mt-1 text-sm text-xedu-slate-500">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setCurrentArticle(null)}
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          Barcha maqolalarga qaytish
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-xedu-slate-400" />
        <Input
          placeholder="Qidirish..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xedu-slate-400 hover:text-xedu-slate-600"
          >
            ×
          </button>
        )}
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors',
              !activeCategory
                ? 'bg-xedu-primary text-white border-xedu-primary'
                : 'bg-xedu-bg-elevated text-xedu-slate-600 border-xedu-border hover:bg-xedu-slate-100'
            )}
          >
            Barchasi
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors',
                activeCategory === cat
                  ? 'bg-xedu-primary text-white border-xedu-primary'
                  : 'bg-xedu-bg-elevated text-xedu-slate-600 border-xedu-border hover:bg-xedu-slate-100'
              )}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      )}

      {/* Recently viewed */}
      {recentArticles.length > 0 && !searchQuery && !activeCategory && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-xedu-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            So&apos;ngi ko&apos;rilganlar
          </h4>
          <div className="space-y-1">
            {recentArticles.map((article) => (
              <button
                key={article.id}
                onClick={() => setCurrentArticle(article.id)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent"
              >
                <HelpCircle className="h-4 w-4 text-xedu-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{article.title}</p>
                  <p className="text-xs text-xedu-slate-500 capitalize">
                    {CATEGORY_LABELS[article.category] ?? article.category}
                  </p>
                </div>
                <ChevronRight className="ml-auto h-4 w-4 text-xedu-slate-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Article list */}
      <ScrollArea className={recentArticles.length > 0 && !searchQuery && !activeCategory ? 'h-[calc(100vh-420px)]' : 'h-[calc(100vh-280px)]'}>
        <div className="space-y-1">
          {filteredArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Search className="h-8 w-8 text-xedu-slate-300" />
              <p className="text-sm text-xedu-slate-500">Maqolalar topilmadi</p>
              <p className="text-xs text-xedu-slate-400">
                Boshqa so&apos;z bilan qidirib ko&apos;ring
              </p>
            </div>
          ) : (
            filteredArticles.map((article) => (
              <button
                key={article.id}
                onClick={() => setCurrentArticle(article.id)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
              >
                <HelpCircle className="h-4 w-4 text-xedu-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{article.title}</p>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border',
                        CATEGORY_COLORS[article.category] ?? 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Tag className="h-2.5 w-2.5 mr-0.5" />
                      {CATEGORY_LABELS[article.category] ?? article.category}
                    </span>
                  </div>
                </div>
                <ChevronRight className="ml-auto h-4 w-4 text-xedu-slate-400 shrink-0" />
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      {content.shortcuts.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <h4 className="text-sm font-semibold text-xedu-slate-500 uppercase tracking-wider">
            Klaviatura yorliqlari
          </h4>
          <div className="space-y-1.5">
            {content.shortcuts.map((sc, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-xedu-slate-600 dark:text-xedu-slate-400">{sc.description}</span>
                <div className="flex items-center gap-1">
                  {sc.keys.map((key, j) => (
                    <span key={j}>
                      <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded border bg-muted px-1.5 py-0.5 text-xs font-medium">
                        {key}
                      </kbd>
                      {j < sc.keys.length - 1 && <span className="text-xedu-slate-400 mx-0.5">+</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
