'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SectionTabs } from '@/components/layout/section-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageActions } from '@/lib/header-actions-context';
import { useAuthStore } from '@/store/auth.store';

import BranchesPage      from '../branches/page';
import CrmPage           from '../crm/page';
import LeaveRequestsPage from '../leave-requests/page';
import DisciplinePage    from '../discipline/page';
import MeetingsPage      from '../meetings/page';
import { StaffWorkspace } from './_components/staff-workspace';

const TABS = [
  { id: 'users',      label: 'Foydalanuvchilar', roles: ['director'] },
  { id: 'branches',   label: 'Filiallar',         roles: ['director'] },
  { id: 'crm',        label: 'CRM — Leadlar',     roles: ['director', 'branch_admin', 'vice_principal'] },
  { id: 'leave',      label: "Ta'til so'rovlari", roles: ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher', 'accountant', 'librarian'] },
  { id: 'discipline', label: 'Intizom jurnali',   roles: ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher'] },
  { id: 'meetings',   label: 'Uchrashuvlar',      roles: ['director', 'vice_principal', 'class_teacher'] },
];


function TabFallback() {
  return (
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}
    </div>
  );
}

function TabContent({ tab }: { tab: string }) {
  switch (tab) {
    case 'branches':   return <BranchesPage />;
    case 'crm':        return <CrmPage />;
    case 'leave':      return <LeaveRequestsPage />;
    case 'discipline': return <DisciplinePage />;
    case 'meetings':   return <MeetingsPage />;
    default:           return <StaffWorkspace />;
  }
}

function StaffContent() {
  const searchParams   = useSearchParams();
  const { user }       = useAuthStore();
  const { setActions } = usePageActions();

  // Compute first accessible tab for this role (fallback when no ?tab= param)
  const firstVisibleTab = TABS.find(t =>
    !t.roles || t.roles.includes(user?.role ?? ''),
  )?.id ?? 'branches';
  const tab = searchParams.get('tab') ?? firstVisibleTab;

  useEffect(() => {
    setActions(null);
    return () => setActions(null);
  }, [tab, setActions]);

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold text-foreground">Xodimlar</h1>
        <p className="text-sm text-xedu-slate-500 dark:text-xedu-slate-400">Foydalanuvchilar, filiallar, CRM va boshqaruv</p>
      </div>
      <div className="mt-3">
        <SectionTabs tabs={TABS} defaultTab={firstVisibleTab} />
      </div>
      <Suspense fallback={<TabFallback />}>
        <TabContent tab={tab} />
      </Suspense>
    </div>
  );
}

export default function StaffPage() {
  return <Suspense><StaffContent /></Suspense>;
}
