'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  Search, X, CornerDownLeft, ArrowUp, ArrowDown,
  FileText, Users, Building2, GraduationCap, Wallet,
  Shield, Bell, Settings, BarChart3, Brain,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════════
   COMMAND PALETTE FOUNDATION
   Global Cmd+K search + command system.

   Features:
   - Unified search trigger
   - Contextual scopes (all / students / staff / finance / etc.)
   - Recent entities
   - Quick navigation
   - Action indexing foundation
   - Keyboard navigation (arrow keys, enter, escape)

   NOT a full command palette yet — this is the foundation.
   ═══════════════════════════════════════════════════════════════════════════════ */

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  shortcut?: string;
  scope: string;
  priority?: number;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
  recentItems?: CommandItem[];
  placeholder?: string;
  className?: string;
}

const SCOPES = [
  { id: 'all', label: 'Barchasi', icon: <Search className="h-3.5 w-3.5" /> },
  { id: 'students', label: "O'quvchilar", icon: <GraduationCap className="h-3.5 w-3.5" /> },
  { id: 'staff', label: 'Xodimlar', icon: <Users className="h-3.5 w-3.5" /> },
  { id: 'branches', label: 'Filiallar', icon: <Building2 className="h-3.5 w-3.5" /> },
  { id: 'finance', label: 'Moliya', icon: <Wallet className="h-3.5 w-3.5" /> },
  { id: 'reports', label: 'Hisobotlar', icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { id: 'analytics', label: 'AI Analytics', icon: <Brain className="h-3.5 w-3.5" /> },
  { id: 'settings', label: 'Sozlamalar', icon: <Settings className="h-3.5 w-3.5" /> },
];

export function CommandPalette({
  open,
  onClose,
  items,
  recentItems = [],
  placeholder = "Qidirish yoki buyruq bering...",
  className,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeScope, setActiveScope] = useState('all');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setActiveScope('all');
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Filter items
  const filtered = useMemo(() => {
    let result = items;

    if (activeScope !== 'all') {
      result = result.filter((i) => i.scope === activeScope || i.scope === 'nav');
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)).slice(0, 12);
  }, [items, activeScope, query]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtered[selectedIndex];
        if (item) executeItem(item, onClose);
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [filtered, selectedIndex, onClose]
  );

  if (!open) return null;

  const showRecents = !query.trim() && recentItems.length > 0 && activeScope === 'all';

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full max-w-xl mx-4 rounded-xl border border-xedu-slate-200 dark:border-xedu-slate-700',
          'bg-white dark:bg-xedu-slate-900 shadow-2xl overflow-hidden',
          className
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-xedu-slate-100 dark:border-xedu-slate-800">
          <Search className="h-4 w-4 text-xedu-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm font-medium text-xedu-slate-900 dark:text-xedu-slate-100 outline-none placeholder:text-xedu-slate-400"
          />
          {query && (
            <button onClick={() => { setQuery(''); inputRef.current?.focus(); }}>
              <X className="h-4 w-4 text-xedu-slate-400 hover:text-xedu-slate-600" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center rounded border border-xedu-slate-200 dark:border-xedu-slate-700 px-1.5 py-0.5 text-[10px] font-mono text-xedu-slate-400">
            ESC
          </kbd>
        </div>

        {/* Scope filters */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-xedu-slate-100 dark:border-xedu-slate-800 overflow-x-auto scrollbar-hide">
          {SCOPES.map((scope) => (
            <button
              key={scope.id}
              onClick={() => { setActiveScope(scope.id); setSelectedIndex(0); }}
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold whitespace-nowrap transition-colors',
                activeScope === scope.id
                  ? 'bg-xedu-slate-900 text-white dark:bg-white dark:text-xedu-slate-900'
                  : 'text-xedu-slate-500 hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800'
              )}
            >
              {scope.icon}
              {scope.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {showRecents && (
            <div className="py-1">
              <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-xedu-slate-400">
                So'nggi
              </p>
              {recentItems.slice(0, 4).map((item, idx) => (
                <ResultRow
                  key={`recent-${item.id}`}
                  item={item}
                  selected={false}
                  onClick={() => executeItem(item, onClose)}
                />
              ))}
            </div>
          )}

          {filtered.length > 0 && (
            <div className="py-1">
              {showRecents && (
                <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-xedu-slate-400">
                  Natijalar
                </p>
              )}
              {filtered.map((item, idx) => (
                <ResultRow
                  key={item.id}
                  item={item}
                  selected={idx === selectedIndex}
                  onClick={() => executeItem(item, onClose)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                />
              ))}
            </div>
          )}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center py-8 gap-2">
              <Search className="h-5 w-5 text-xedu-slate-300" />
              <p className="text-sm text-xedu-slate-500">Natija topilmadi</p>
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div className="hidden sm:flex items-center justify-between px-4 py-2 border-t border-xedu-slate-100 dark:border-xedu-slate-800 bg-xedu-slate-50/50 dark:bg-xedu-slate-800/30">
          <div className="flex items-center gap-3">
            <Hint icon={<ArrowUp className="h-3 w-3" />} label="Yuqori" />
            <Hint icon={<ArrowDown className="h-3 w-3" />} label="Past" />
            <Hint icon={<CornerDownLeft className="h-3 w-3" />} label="Tanlash" />
          </div>
          <span className="text-[10px] text-xedu-slate-400">{filtered.length} ta natija</span>
        </div>
      </div>
    </div>
  );
}

function ResultRow({
  item,
  selected,
  onClick,
  onMouseEnter,
}: {
  item: CommandItem;
  selected: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
        selected
          ? 'bg-xedu-primary-light/40 dark:bg-xedu-primary/20'
          : 'hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/50'
      )}
    >
      <div className="shrink-0 text-xedu-slate-400">
        {item.icon ?? <FileText className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-xedu-slate-800 dark:text-xedu-slate-200 truncate">
          {item.label}
        </p>
        {item.description && (
          <p className="text-[11px] text-xedu-slate-500 truncate">{item.description}</p>
        )}
      </div>
      {item.shortcut && (
        <kbd className="shrink-0 hidden sm:inline-flex items-center rounded border border-xedu-slate-200 dark:border-xedu-slate-700 px-1.5 py-0.5 text-[10px] font-mono text-xedu-slate-400">
          {item.shortcut}
        </kbd>
      )}
    </button>
  );
}

function Hint({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1 text-xedu-slate-400">
      <kbd className="inline-flex items-center rounded border border-xedu-slate-200 dark:border-xedu-slate-700 px-1 py-0.5 text-[10px] font-mono">
        {icon}
      </kbd>
      <span className="text-[10px]">{label}</span>
    </div>
  );
}

function executeItem(item: CommandItem, onClose: () => void) {
  if (item.href) {
    window.location.href = item.href;
  } else if (item.onClick) {
    item.onClick();
  }
  onClose();
}

/* ── useCommandPalette hook ─────────────────────────────────────────────────── */

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return { open, setOpen };
}
