'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { HelpCircle, ChevronRight } from 'lucide-react';
import { useHelp } from './help-provider';

export function HelpArticleRenderer() {
  const { currentPageArticle, content, setCurrentArticle } = useHelp();

  if (currentPageArticle) {
    return (
      <div className="space-y-4">
        <div>
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
      <div>
        <h3 className="text-lg font-semibold">Yordam markazi</h3>
        <p className="mt-1 text-sm text-xedu-slate-500">
          Platforma bo&apos;yicha qo&apos;llanmalar va savollar
        </p>
      </div>

      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-1">
          {content.articles.map((article) => (
            <button
              key={article.id}
              onClick={() => setCurrentArticle(article.id)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
            >
              <HelpCircle className="h-4 w-4 text-xedu-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{article.title}</p>
                <p className="text-xs text-xedu-slate-500 capitalize">{article.category}</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-xedu-slate-400 shrink-0" />
            </button>
          ))}
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
