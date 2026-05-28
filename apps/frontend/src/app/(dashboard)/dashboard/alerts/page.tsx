'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckSquare, Square, AlertTriangle, Info, AlertCircle,
  Clock, ArrowRight, TrendingDown, Users, BookOpen, Wallet, ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { branchesApi } from '@/lib/api/branches';
import { classesApi } from '@/lib/api/classes';
import { usersApi } from '@/lib/api/users';
import { disciplineApi } from '@/lib/api/discipline';
import { leaveRequestsApi } from '@/lib/api/leave-requests';
import { aiAnalyticsApi } from '@/lib/api/ai-analytics';
import {
  SplitView, SplitViewListHeader, SplitViewListBody,
} from '@/components/director-workspace/split-view';
import { RealtimePulse } from '@/components/workspace-system';
import { FloatingBulkToolbar } from '@/components/director-workspace/floating-bulk-toolbar';
import { AuditDetailPane } from '@/components/director-workspace/audit-detail-pane';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════════════════════
   ALERT CENTER - Derived alerts from existing operational data

   Since there is no dedicated Alert entity in the backend, all alerts are
   derived in real-time from existing APIs. This keeps the system honest:
   every alert corresponds to a real data condition.

   Derived sources:
   - Branches: low attendance threshold, finance health
   - Classes: academic performance drops, upcoming exams
   - Users: staff absences (leave requests)
   - Discipline: unresolved incidents
   - AI Analytics: risk predictions
   ═══════════════════════════════════════════════════════════════════════════════ */

type AlertSeverity = 'critical' | 'warning' | 'info';
type AlertCategory = 'academic' | 'financial' | 'staff' | 'discipline' | 'system';

interface AlertItem {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  description: string;
  source: string;
  createdAt: string;
  link?: string;
  linkLabel?: string;
  acknowledged: boolean;
  rawKey: string;
}

export default function AlertCenterPage() {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterSeverity, setFilterSeverity] = useState<'all' | AlertSeverity>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | AlertCategory>('all');
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  // - Data fetching -
  const { data: branchesData, isLoading: bLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.getAll(),
  });
  const { data: classesData, isLoading: cLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesApi.getAll(),
  });
  const { data: usersData, isLoading: uLoading } = useQuery({
    queryKey: ['users', 'staff'],
    queryFn: () => usersApi.getAll({ role: 'teacher' }),
  });
  const { data: disciplineData, isLoading: dLoading } = useQuery({
    queryKey: ['discipline', 'all'],
    queryFn: () => disciplineApi.getAll({ limit: 200 }),
  });
  const { data: leaveData, isLoading: lLoading } = useQuery({
    queryKey: ['leave-requests', 'pending'],
    queryFn: () => leaveRequestsApi.getAll({ status: 'pending' }),
  });
  const { data: aiData, isLoading: aLoading } = useQuery({
    queryKey: ['ai-analytics'],
    queryFn: () => aiAnalyticsApi.getDashboard(),
  });

  const branches: any[] = (branchesData as any)?.data ?? [];
  const classList: any[] = (classesData as any)?.data ?? [];
  const staffList: any[] = (usersData as any)?.data ?? [];
  const discList: any[] = (disciplineData as any)?.data ?? [];
  const leaveList: any[] = (leaveData as any)?.data ?? (Array.isArray(leaveData) ? leaveData : []);
  const aiOverview: any = (aiData as any) ?? {};

  // - Derive alerts -
  const alerts: AlertItem[] = useMemo(() => {
    const items: AlertItem[] = [];

    // 1. Unresolved discipline incidents
    discList.forEach((d: any) => {
      if (!d.resolved) {
        const isHigh = d.severity === 'high';
        items.push({
          id: `disc-${d.id}`,
          severity: isHigh ? 'critical' : 'warning',
          category: 'discipline',
          title: `${d.student?.firstName ?? ''} ${d.student?.lastName ?? ''} - ${d.type}`,
          description: d.description,
          source: d.reportedBy ? `${d.reportedBy.firstName} ${d.reportedBy.lastName}` : 'Tizim',
          createdAt: d.createdAt,
          link: '/dashboard/discipline',
          linkLabel: 'Intizomga otish',
          acknowledged: false,
          rawKey: `disc-${d.id}`,
        });
      }
    });

    // 2. Pending leave requests
    leaveList.forEach((l: any) => {
      if (l.status === 'pending') {
        const age = Date.now() - new Date(l.createdAt).getTime();
        const daysOld = age / 86400000;
        items.push({
          id: `leave-${l.id}`,
          severity: daysOld > 3 ? 'warning' : 'info',
          category: 'staff',
          title: `${l.requester?.firstName ?? ''} ${l.requester?.lastName ?? ''} - ${l.type ?? "ta'til"}`,
          description: l.reason,
          source: l.requester?.branch?.name ?? "Nomalum filial",
          createdAt: l.createdAt,
          link: '/dashboard/approvals',
          linkLabel: "Tasdiqlash inboxiga otish",
          acknowledged: false,
          rawKey: `leave-${l.id}`,
        });
      }
    });

    // 3. AI risk predictions
    const riskStudents: any[] = aiOverview?.riskStudents ?? [];
    riskStudents.forEach((s: any, idx: number) => {
      items.push({
        id: `ai-risk-${idx}`,
        severity: s.riskScore > 0.8 ? 'critical' : 'warning',
        category: 'academic',
        title: `${s.firstName ?? "Oquvchi"} ${s.lastName ?? ''} - yuqori xavf`,
        description: `Analitik tahliliga ko'ra xavf darajasi ${Math.round((s.riskScore ?? 0) * 100)}%`,
        source: 'Analitik tahlil',
        createdAt: s.updatedAt ?? new Date().toISOString(),
        link: '/dashboard/education',
        linkLabel: "Ta'limga otish",
        acknowledged: false,
        rawKey: `ai-risk-${s.studentId ?? idx}`,
      });
    });

    // 4. Low branch attendance
    branches.forEach((b: any) => {
      const rate = b.attendanceRate ?? b.stats?.attendanceRate;
      if (typeof rate === 'number' && rate < 0.8) {
        items.push({
          id: `branch-att-${b.id}`,
          severity: rate < 0.7 ? 'critical' : 'warning',
          category: 'academic',
          title: `${b.name} - past davomat`,
          description: `Filial davomati ${Math.round(rate * 100)}% - normaldan past`,
          source: 'Davomat tizimi',
          createdAt: new Date().toISOString(),
          link: '/dashboard/branches',
          linkLabel: "Fillallarga otish",
          acknowledged: false,
          rawKey: `branch-att-${b.id}`,
        });
      }
    });

    // Sort: critical > warning > info, then date desc
    return items.sort((a, b) => {
      const sevOrder = { critical: 3, warning: 2, info: 1 };
      const diff = sevOrder[b.severity] - sevOrder[a.severity];
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [discList, leaveList, aiOverview, branches]);

  const effectiveAlerts = useMemo(() => {
    return alerts.map((a) => ({
      ...a,
      acknowledged: acknowledgedIds.has(a.id),
    }));
  }, [alerts, acknowledgedIds]);

  // - Filters -
  const filtered = useMemo(() => {
    return effectiveAlerts.filter((a) => {
      if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
      if (filterCategory !== 'all' && a.category !== filterCategory) return false;
      return true;
    });
  }, [effectiveAlerts, filterSeverity, filterCategory]);

  const selectedItem = filtered.find((a) => a.id === selectedId) ?? null;

  // - Multi-select -
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((f) => f.id)));
    }
  }, [filtered, selectedIds.size]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // - Bulk acknowledge -
  const bulkActions = [
    {
      id: 'acknowledge',
      label: "O'qib chiqildi",
      icon: CheckSquare,
      tone: 'primary' as const,
      onClick: (ids: string[]) => {
        setAcknowledgedIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.add(id));
          return next;
        });
        setSelectedIds(new Set());
        toast({ title: `${ids.length} ta ogohlantirish o'qib chiqildi` });
      },
    },
  ];

  const isLoading = bLoading || cLoading || uLoading || dLoading || lLoading || aLoading;
  const criticalCount = effectiveAlerts.filter((a) => a.severity === 'critical' && !a.acknowledged).length;
  const warningCount = effectiveAlerts.filter((a) => a.severity === 'warning' && !a.acknowledged).length;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Page header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-xedu-slate-100 dark:border-xedu-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-xedu-slate-900 dark:text-xedu-slate-100">
            Ogohlantirishlar markazi
          </h1>
          {criticalCount > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-xedu-ruby-50 text-xedu-ruby-600 border border-xedu-ruby-100">
              {criticalCount} ta jiddiy
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-xedu-amber-50 text-xedu-amber-600 border border-xedu-amber-100">
              {warningCount} ta etibor
            </span>
          )}
        </div>
        <RealtimePulse
          events={['discipline:created', 'discipline:resolved', 'leave-request:created', 'leave-request:updated', 'payment:received', 'class:created', 'class:updated', 'class:removed']}
          label="Ma'lumot yangilandi"
        />
      </div>

      <SplitView
        showDetail={!!selectedId}
        onHideDetail={() => setSelectedId(null)}
        listWidth="min-w-0 lg:w-[420px] xl:w-[460px]"
      >
        {/* - LIST PANE - */}
        <>
          <SplitViewListHeader>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAllVisible}
                className="flex items-center justify-center h-6 w-6 min-h-[44px] min-w-[44px] rounded hover:bg-xedu-slate-100 transition-colors"
              >
                {selectedIds.size === filtered.length && filtered.length > 0 ? (
                  <CheckSquare className="h-4 w-4 text-xedu-primary" />
                ) : selectedIds.size > 0 ? (
                  <div className="h-4 w-4 rounded-sm border-2 border-xedu-primary bg-xedu-primary-light relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-0.5 w-2 bg-xedu-primary rounded-full" />
                    </div>
                  </div>
                ) : (
                  <Square className="h-4 w-4 text-xedu-slate-300" />
                )}
              </button>
              <span className="text-[11px] font-semibold text-xedu-slate-500">
                {filtered.filter((a) => !a.acknowledged).length} ta / {filtered.length} ta
              </span>
            </div>

            <div className="flex items-center gap-1">
              <FilterChip active={filterSeverity === 'all'} onClick={() => setFilterSeverity('all')}>
                Barchasi
              </FilterChip>
              <FilterChip active={filterSeverity === 'critical'} onClick={() => setFilterSeverity('critical')}>
                Jiddiy
              </FilterChip>
              <FilterChip active={filterSeverity === 'warning'} onClick={() => setFilterSeverity('warning')}>
                Ogohlantirish
              </FilterChip>
            </div>
          </SplitViewListHeader>

          <SplitViewListBody>
            {isLoading ? (
              <div className="space-y-0">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-[60px] rounded-none mx-3 my-1" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <Info className="h-6 w-6 text-xedu-slate-300" />
                <p className="text-sm text-xedu-slate-500">Ogohlantirishlar yoq</p>
              </div>
            ) : (
              <div className="divide-y divide-xedu-slate-100 dark:divide-xedu-slate-800">
                {filtered.map((item) => (
                  <AlertRow
                    key={item.id}
                    item={item}
                    selected={selectedId === item.id}
                    checked={selectedIds.has(item.id)}
                    onSelect={() => setSelectedId(item.id)}
                    onToggleCheck={() => toggleSelect(item.id)}
                  />
                ))}
              </div>
            )}
          </SplitViewListBody>
        </>

        {/* - DETAIL PANE - */}
        <AuditDetailPane
          empty={!selectedItem}
          title={selectedItem?.title ?? ''}
          subtitle={selectedItem ? categoryLabel(selectedItem.category) : ''}
          status={selectedItem?.severity === 'critical' ? 'open' : selectedItem?.severity === 'warning' ? 'pending' : 'resolved'}
          source={selectedItem?.source}
          createdAt={selectedItem?.createdAt}
          events={buildAlertEvents(selectedItem)}
          actions={
            selectedItem ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAcknowledgedIds((prev) => new Set(prev).add(selectedItem.id));
                    toast({ title: "O'qib chiqildi" });
                  }}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-xedu-primary text-white hover:bg-xedu-primary-hover transition-colors"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  O&apos;qib chiqildi
                </button>
                {selectedItem.link && (
                  <Link
                    href={selectedItem.link}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border border-xedu-slate-200 text-xedu-slate-600 hover:bg-xedu-slate-50 transition-colors"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    {selectedItem.linkLabel ?? "O'tish"}
                  </Link>
                )}
              </div>
            ) : null
          }
        />
      </SplitView>

      <FloatingBulkToolbar
        visible={selectedIds.size >= 1}
        selectedIds={Array.from(selectedIds)}
        actions={bulkActions}
        onClear={clearSelection}
      />
    </div>
  );
}

// - Sub-components -

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2 py-1 min-h-[44px] min-w-[44px] rounded-md text-[11px] font-semibold transition-colors',
        active
          ? 'bg-xedu-slate-900 text-white dark:bg-white dark:text-xedu-slate-900'
          : 'text-xedu-slate-500 hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800'
      )}
    >
      {children}
    </button>
  );
}

function AlertRow({
  item,
  selected,
  checked,
  onSelect,
  onToggleCheck,
}: {
  item: AlertItem;
  selected: boolean;
  checked: boolean;
  onSelect: () => void;
  onToggleCheck: () => void;
}) {
  const severityConfig = {
    critical: { icon: AlertCircle, dot: 'bg-xedu-ruby-500', text: 'text-xedu-ruby-600' },
    warning: { icon: AlertTriangle, dot: 'bg-xedu-amber-500', text: 'text-xedu-amber-600' },
    info: { icon: Info, dot: 'bg-xedu-sky-400', text: 'text-xedu-sky-500' },
  };
  const cfg = severityConfig[item.severity];
  const Icon = cfg.icon;
  const age = getAgeLabel(item.createdAt);

  return (
    <div
      className={cn(
        'relative flex items-start gap-2 px-3 py-2.5 transition-colors cursor-pointer',
        selected
          ? 'bg-xedu-primary-light/30 border-l-2 border-l-xedu-primary'
          : 'border-l-2 border-l-transparent hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/40',
        item.acknowledged && 'opacity-50'
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-check]')) return;
        onSelect();
      }}
    >
      <button
        data-check
        onClick={(e) => { e.stopPropagation(); onToggleCheck(); }}
        className="mt-0.5 shrink-0"
      >
        {checked ? (
          <CheckSquare className="h-4 w-4 text-xedu-primary" />
        ) : (
          <Square className="h-4 w-4 text-xedu-slate-300" />
        )}
      </button>

      <div className="shrink-0 mt-0.5">
        <Icon className={cn('h-4 w-4', cfg.text)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <SeverityBadge severity={item.severity} />
          <CategoryBadge category={item.category} />
          <span className="text-[10px] text-xedu-slate-400 flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            {age}
          </span>
        </div>
        <p className={cn(
          'text-[13px] leading-snug truncate',
          item.acknowledged ? 'font-normal text-xedu-slate-500' : 'font-semibold text-xedu-slate-800 dark:text-xedu-slate-200'
        )}>
          {item.title}
        </p>
        <p className="text-[11px] text-xedu-slate-500 truncate mt-0.5">{item.description}</p>
        <p className="text-[10px] text-xedu-slate-400 mt-0.5">Manba: {item.source}</p>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const map = {
    critical: { label: 'Jiddiy', bg: 'bg-xedu-ruby-50 text-xedu-ruby-600 border-xedu-ruby-100' },
    warning: { label: 'Ogohlantirish', bg: 'bg-xedu-amber-50 text-xedu-amber-600 border-xedu-amber-100' },
    info: { label: "Ma'lumot", bg: 'bg-xedu-sky-50 text-xedu-sky-600 border-xedu-sky-100' },
  };
  const cfg = map[severity];
  return (
    <span className={cn('text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border', cfg.bg)}>
      {cfg.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: AlertCategory }) {
  const map: Record<AlertCategory, string> = {
    academic: "Ta'lim",
    financial: 'Moliya',
    staff: 'Xodimlar',
    discipline: 'Intizom',
    system: 'Tizim',
  };
  return (
    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-xedu-slate-50 text-xedu-slate-500 border-xedu-slate-100">
      {map[category]}
    </span>
  );
}

function categoryLabel(c: AlertCategory): string {
  const map: Record<AlertCategory, string> = {
    academic: "Ta'lim ogohlantirishi",
    financial: 'Moliyaviy ogohlantirish',
    staff: 'Xodimlar ogohlantirishi',
    discipline: 'Intizom holati',
    system: 'Tizim ogohlantirishi',
  };
  return map[c];
}

function getAgeLabel(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Hozir';
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  return `${days} kun oldin`;
}

function buildAlertEvents(item: AlertItem | null): { label: string; value: string; timestamp?: string; tone: 'calm' | 'attention' | 'urgent' | 'success' }[] {
  if (!item) return [];
  return [
    {
      label: 'Ogohlantirish yuzaga keldi',
      value: item.description,
      timestamp: item.createdAt,
      tone: item.severity === 'critical' ? 'urgent' : item.severity === 'warning' ? 'attention' : 'calm',
    },
    {
      label: 'Manba',
      value: item.source,
      tone: 'calm' as const,
    },
    {
      label: 'Kategoriya',
      value: categoryLabel(item.category),
      tone: 'calm' as const,
    },
  ];
}
