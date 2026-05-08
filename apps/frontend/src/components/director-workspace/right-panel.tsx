'use client';

import { useEffect, useCallback } from 'react';
import { X, Building2, Users, GraduationCap, MapPin, TrendingUp, BookOpen, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export interface BranchDetail {
  id: string;
  name: string;
  address?: string | null;
  code?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  studentCount?: number;
  teacherCount?: number;
  staffCount?: number;
}

interface RightContextualPanelProps {
  open: boolean;
  onClose: () => void;
  branch: BranchDetail | null;
}

export function RightContextualPanel({ open, onClose, branch }: RightContextualPanelProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!branch) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/20 z-40 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 bg-white dark:bg-xedu-slate-900 border-l border-xedu-slate-100 dark:border-xedu-slate-800',
          'w-full md:w-[440px] lg:w-[480px]',
          'transform transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Filial ma'lumotlari"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-xedu-slate-100 dark:border-xedu-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-xedu-primary-light">
              <Building2 className="h-4 w-4 text-xedu-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate text-xedu-slate-900 dark:text-xedu-slate-100">
                {branch.name}
              </h3>
              <p className="text-[11px] text-xedu-slate-500 truncate">
                {branch.code || 'Filial'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-xedu-slate-100 dark:hover:bg-xedu-slate-800 transition-colors shrink-0"
            aria-label="Yopish"
          >
            <X className="h-4 w-4 text-xedu-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6 overflow-y-auto h-[calc(100vh-64px)]">
          {/* Status */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'h-2 w-2 rounded-full shrink-0',
                branch.isActive ? 'bg-xedu-primary' : 'bg-red-500'
              )}
            />
            <span className="text-xs font-semibold text-xedu-slate-700 dark:text-xedu-slate-300">
              {branch.isActive ? 'Faol' : 'Nofaol'}
            </span>
          </div>

          {/* Location */}
          {branch.address && (
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-xedu-slate-400 shrink-0 mt-0.5" />
              <span className="text-sm text-xedu-slate-600 dark:text-xedu-slate-400">{branch.address}</span>
            </div>
          )}

          {/* Contact */}
          {(branch.phone || branch.email) && (
            <div className="space-y-1.5">
              {branch.phone && (
                <p className="text-sm text-xedu-slate-600 dark:text-xedu-slate-400">{branch.phone}</p>
              )}
              {branch.email && (
                <p className="text-sm text-xedu-slate-600 dark:text-xedu-slate-400">{branch.email}</p>
              )}
            </div>
          )}

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <MetricPill
              label="O'quvchilar"
              value={branch.studentCount ?? 0}
              icon={GraduationCap}
            />
            <MetricPill
              label="O'qituvchilar"
              value={branch.teacherCount ?? 0}
              icon={Users}
            />
            <MetricPill
              label="Xodimlar"
              value={branch.staffCount ?? 0}
              icon={Users}
            />
          </div>

          {/* Quick links */}
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-xedu-slate-400 mb-2">
              Tezkor havolalar
            </p>
            <QuickLinkRow href={`/dashboard/branches/${branch.id}`} label="Filial sahifasi" icon={Building2} />
            <QuickLinkRow href={`/dashboard/finance`} label="Moliya ko'rinishi" icon={TrendingUp} />
            <QuickLinkRow href={`/dashboard/education`} label="Akademik ma'lumotlar" icon={BookOpen} />
          </div>
        </div>
      </div>
    </>
  );
}

function MetricPill({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 p-3 text-center">
      <div className="h-7 w-7 rounded-lg bg-xedu-slate-50 dark:bg-xedu-slate-800 flex items-center justify-center mx-auto mb-2">
        <Icon className="h-3.5 w-3.5 text-xedu-slate-500" />
      </div>
      <p className="text-lg font-black leading-none text-xedu-slate-900 dark:text-xedu-slate-100">{value}</p>
      <p className="text-[11px] font-medium text-xedu-slate-500 mt-1">{label}</p>
    </div>
  );
}

function QuickLinkRow({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/50 transition-colors group"
    >
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-xedu-slate-400 group-hover:text-xedu-primary transition-colors" />
        <span className="text-sm font-medium text-xedu-slate-700 dark:text-xedu-slate-300 group-hover:text-xedu-slate-900 dark:group-hover:text-xedu-slate-100 transition-colors">
          {label}
        </span>
      </div>
      <ArrowUpRight className="h-3.5 w-3.5 text-xedu-slate-300 group-hover:text-xedu-primary transition-colors" />
    </Link>
  );
}
