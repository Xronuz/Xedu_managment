'use client';

import { useEffect, useCallback, useState } from 'react';
import {
  X, Building2, Users, GraduationCap, MapPin, TrendingUp,
  BookOpen, ArrowUpRight, ClipboardCheck, AlertTriangle, Clock,
  ShieldCheck, Activity, FileText,
} from 'lucide-react';
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

type PanelTab = 'overview' | 'academics' | 'finance' | 'staff';

interface RightContextualPanelProps {
  open: boolean;
  onClose: () => void;
  branch: BranchDetail | null;
  pendingLeaves?: any[];
  pendingDiscipline?: any[];
  attendanceSummary?: { presentPct?: number; totalStudents?: number } | null;
  allUsers?: any[];
}

export function RightContextualPanel({
  open,
  onClose,
  branch,
  pendingLeaves = [],
  pendingDiscipline = [],
  attendanceSummary,
  allUsers = [],
}: RightContextualPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('overview');

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setActiveTab('overview');
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!branch) return null;

  const branchAlerts = pendingDiscipline.filter((d: any) => d.student?.branchId === branch.id).length;
  const branchPending = pendingLeaves.filter((l: any) => l.requester?.branchId === branch.id).length;
  const branchUsers = allUsers.filter((u: any) => u.branchId === branch.id);
  const branchStudents = branchUsers.filter((u: any) => u.role === 'student');
  const branchTeachers = branchUsers.filter((u: any) => ['teacher', 'class_teacher'].includes(u.role));
  const branchStaff = branchUsers.filter((u: any) => !['student', 'teacher', 'class_teacher', 'parent'].includes(u.role));

  const tabs: { id: PanelTab; label: string }[] = [
    { id: 'overview', label: 'Umumiy' },
    { id: 'academics', label: 'Akademik' },
    { id: 'finance', label: 'Moliya' },
    { id: 'staff', label: 'Xodimlar' },
  ];

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
          'w-full md:w-[460px] lg:w-[500px]',
          'transform transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Filial ma'lumotlari"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-xedu-slate-100 dark:border-xedu-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-xedu-primary-light">
              <Building2 className="h-4 w-4 text-xedu-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate text-xedu-slate-900 dark:text-xedu-slate-100">
                {branch.name}
              </h3>
              <p className="text-[11px] text-xedu-slate-500 truncate">
                {branch.code || 'Filial'} · {branch.isActive ? 'Faol' : 'Nofaol'}
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

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-xedu-slate-100 dark:border-xedu-slate-800 px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors',
                activeTab === tab.id
                  ? 'text-xedu-primary'
                  : 'text-xedu-slate-400 hover:text-xedu-slate-600 dark:hover:text-xedu-slate-300'
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-xedu-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-4 space-y-5 overflow-y-auto h-[calc(100vh-110px)]">
          {activeTab === 'overview' && (
            <OverviewTab
              branch={branch}
              branchAlerts={branchAlerts}
              branchPending={branchPending}
              branchUsers={branchUsers}
            />
          )}
          {activeTab === 'academics' && (
            <AcademicsTab
              studentCount={branchStudents.length}
              attendancePct={attendanceSummary?.presentPct}
            />
          )}
          {activeTab === 'finance' && (
            <FinanceTab />
          )}
          {activeTab === 'staff' && (
            <StaffTab
              teachers={branchTeachers}
              staff={branchStaff}
              pendingLeaves={branchPending}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({
  branch,
  branchAlerts,
  branchPending,
  branchUsers,
}: {
  branch: BranchDetail;
  branchAlerts: number;
  branchPending: number;
  branchUsers: any[];
}) {
  return (
    <div className="space-y-5">
      {/* Status + Alerts */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'h-2 w-2 rounded-full',
            branch.isActive ? 'bg-xedu-primary' : 'bg-xedu-ruby-500'
          )}
        />
        <span className="text-xs font-semibold text-xedu-slate-700 dark:text-xedu-slate-300">
          {branch.isActive ? 'Faol' : 'Nofaol'}
        </span>
        {branchAlerts > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-xedu-ruby-500 ml-auto">
            <AlertTriangle className="h-3 w-3" />
            {branchAlerts} ta ogohlantirish
          </span>
        )}
        {branchPending > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-xedu-amber-500 ml-auto">
            <Clock className="h-3 w-3" />
            {branchPending} ta tasdiqlash
          </span>
        )}
      </div>

      {/* Location */}
      {branch.address && (
        <div className="flex items-start gap-2">
          <MapPin className="h-3.5 w-3.5 text-xedu-slate-400 shrink-0 mt-0.5" />
          <span className="text-sm text-xedu-slate-600 dark:text-xedu-slate-400">{branch.address}</span>
        </div>
      )}
      {(branch.phone || branch.email) && (
        <div className="space-y-1">
          {branch.phone && <p className="text-sm text-xedu-slate-600 dark:text-xedu-slate-400">{branch.phone}</p>}
          {branch.email && <p className="text-sm text-xedu-slate-600 dark:text-xedu-slate-400">{branch.email}</p>}
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2">
        <MetricPill label="O'quvchilar" value={branch.studentCount ?? 0} icon={GraduationCap} />
        <MetricPill label="O'qituvchilar" value={branch.teacherCount ?? 0} icon={Users} />
        <MetricPill label="Xodimlar" value={branch.staffCount ?? 0} icon={ShieldCheck} />
      </div>

      {/* Quick actions */}
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-xedu-slate-400 mb-1.5">Tezkor amallar</p>
        <QuickLinkRow href={`/dashboard/branches/${branch.id}`} label="Filial sahifasi" icon={Building2} />
        <QuickLinkRow href="/dashboard/finance" label="Moliya ko'rinishi" icon={TrendingUp} />
        <QuickLinkRow href="/dashboard/education" label="Akademik ma'lumotlar" icon={BookOpen} />
        <QuickLinkRow href="/dashboard/reports" label="Hisobotlar" icon={FileText} />
      </div>
    </div>
  );
}

// ── Tab: Academics ───────────────────────────────────────────────────────────

function AcademicsTab({ studentCount, attendancePct }: { studentCount: number; attendancePct?: number }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <MetricPill label="O'quvchilar" value={studentCount} icon={GraduationCap} />
        <MetricPill
          label="Davomat"
          value={attendancePct != null ? `${attendancePct}%` : "—"}
          icon={ClipboardCheck}
        />
      </div>
      {attendancePct != null && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-xedu-slate-500">Davomat foizi</span>
            <span className="text-[11px] font-bold text-xedu-slate-800">{attendancePct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-xedu-primary transition-all"
              style={{ width: `${Math.min(attendancePct, 100)}%` }}
            />
          </div>
        </div>
      )}
      <QuickLinkRow href="/dashboard/attendance" label="Davomat hisoboti" icon={ClipboardCheck} />
      <QuickLinkRow href="/dashboard/classes" label="Sinflar" icon={BookOpen} />
      <QuickLinkRow href="/dashboard/exams" label="Imtihonlar" icon={Activity} />
    </div>
  );
}

// ── Tab: Finance ─────────────────────────────────────────────────────────────

function FinanceTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-xedu-slate-100 dark:border-xedu-slate-800 p-4 text-center">
        <p className="text-sm text-xedu-slate-500">Filial daromadi</p>
        <p className="text-lg font-black text-xedu-slate-900 dark:text-xedu-slate-100 mt-1">Ma'lumot mavjud emas</p>
        <p className="text-[11px] text-xedu-slate-400 mt-1">Filial ma'lumotlari kiritilganda ko'rsatiladi</p>
      </div>
      <QuickLinkRow href="/dashboard/finance" label="Moliya bo'limi" icon={TrendingUp} />
      <QuickLinkRow href="/dashboard/payments" label="To'lovlar" icon={Activity} />
      <QuickLinkRow href="/dashboard/fee-structures" label="To'lov tariflari" icon={FileText} />
    </div>
  );
}

// ── Tab: Staff ───────────────────────────────────────────────────────────────

function StaffTab({ teachers, staff, pendingLeaves }: { teachers: any[]; staff: any[]; pendingLeaves: number }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <MetricPill label="O'qituvchilar" value={teachers.length} icon={Users} />
        <MetricPill label="Boshqa xodimlar" value={staff.length} icon={ShieldCheck} />
      </div>
      {pendingLeaves > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-xedu-amber-100 dark:border-xedu-amber-900/30 bg-xedu-amber-50 dark:bg-xedu-amber-900/10 px-3 py-2">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-xedu-amber-500" />
            <span className="text-xs font-medium text-xedu-amber-700 dark:text-xedu-amber-400">Ta'til so'rovlari</span>
          </div>
          <span className="text-xs font-bold text-xedu-amber-700 dark:text-xedu-amber-400">{pendingLeaves}</span>
        </div>
      )}
      <QuickLinkRow href="/dashboard/users" label="Barcha xodimlar" icon={Users} />
      <QuickLinkRow href="/dashboard/leave-requests" label="Ta'til so'rovlari" icon={Clock} />
      <QuickLinkRow href="/dashboard/payroll" label="Ish haqi" icon={TrendingUp} />
    </div>
  );
}

// ── Shared primitives ────────────────────────────────────────────────────────

function MetricPill({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <div className="rounded-lg border border-xedu-slate-100 dark:border-xedu-slate-800 p-2.5 text-center">
      <div className="h-6 w-6 rounded-md bg-xedu-slate-50 dark:bg-xedu-slate-800 flex items-center justify-center mx-auto mb-1.5">
        <Icon className="h-3 w-3 text-xedu-slate-500" />
      </div>
      <p className="text-base font-black leading-none text-xedu-slate-900 dark:text-xedu-slate-100">{value}</p>
      <p className="text-[10px] font-medium text-xedu-slate-500 mt-1">{label}</p>
    </div>
  );
}

function QuickLinkRow({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/50 transition-colors group"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-xedu-slate-400 group-hover:text-xedu-primary transition-colors" />
        <span className="text-sm font-medium text-xedu-slate-700 dark:text-xedu-slate-300 group-hover:text-xedu-slate-900 dark:group-hover:text-xedu-slate-100 transition-colors">
          {label}
        </span>
      </div>
      <ArrowUpRight className="h-3 w-3 text-xedu-slate-300 group-hover:text-xedu-primary transition-colors" />
    </Link>
  );
}
