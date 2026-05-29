/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DirectorDashboard } from './director-dashboard';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock auth store
vi.mock('@/store/auth.store', () => ({
  useAuthStore: () => ({ user: { schoolId: 'school-1' }, activeBranchId: null }),
}));

// Mock API modules — return empty/safe data so the dashboard renders without crashes
vi.mock('@/lib/api/users', () => ({
  usersApi: { getAll: vi.fn().mockResolvedValue({ data: [] }) },
}));
vi.mock('@/lib/api/classes', () => ({
  classesApi: { getAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/lib/api/attendance', () => ({
  attendanceApi: { getTodaySummary: vi.fn().mockResolvedValue({ presentPct: 0, marked: 0, totalStudents: 0 }) },
}));
vi.mock('@/lib/api/exams', () => ({
  examsApi: { getUpcoming: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/lib/api/kpi', () => ({
  kpiApi: { getDashboard: vi.fn().mockResolvedValue({ items: [] }) },
}));
vi.mock('@/lib/api/branches', () => ({
  branchesApi: { getAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/lib/api/leave-requests', () => ({
  leaveRequestsApi: { getAll: vi.fn().mockResolvedValue({ data: [] }) },
}));
vi.mock('@/lib/api/discipline', () => ({
  disciplineApi: { getAll: vi.fn().mockResolvedValue({ data: [] }) },
}));
vi.mock('@/lib/api/finance', () => ({
  financeApi: { getDashboard: vi.fn().mockResolvedValue({}) },
}));
vi.mock('@/lib/api/ops-command-center', () => ({
  opsCommandCenterApi: {
    getTodaySummary: vi.fn().mockResolvedValue({
      stats: { totalClassesToday: 0, totalTeachersToday: 0, periodsConfigured: false, roomsConfigured: false },
      schedule: { publishedSlots: 0, draftSlots: 0, conflicts: 0 },
      staff: { teachersPresent: 0, teachersAbsent: 0, teachersSubstituted: 0, pendingLeaveRequests: 0 },
      substitutions: { pendingProposals: 0, activeToday: 0 },
      payroll: { currentMonthStatus: 'pending', missingAttendanceCount: 0 },
      alerts: { critical: 0, warning: 0, info: 0 },
    }),
    getAlerts: vi.fn().mockResolvedValue([]),
    getReadiness: vi.fn().mockResolvedValue({ score: 0, status: 'not_started', checklist: [] }),
    getRoleReadiness: vi.fn().mockResolvedValue({ myActions: [], delegatedActions: [], informationalBlockers: [], score: 0, status: 'not_started' }),
  },
}));

describe('DirectorDashboard (Phase 3 executive redesign)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing with empty API data', () => {
    render(React.createElement(DirectorDashboard), { wrapper: Wrapper });
    expect(screen.getByText('Direktor paneli')).toBeTruthy();
    expect(screen.getByText(/Maktab umumiy holati/)).toBeTruthy();
  });

  it('shows Operatsion markaz CTA button', () => {
    render(React.createElement(DirectorDashboard), { wrapper: Wrapper });
    expect(screen.getAllByText('Operatsion markaz').length).toBeGreaterThan(0);
  });

  it('shows ZONE A — Executive Snapshot cards', () => {
    render(React.createElement(DirectorDashboard), { wrapper: Wrapper });
    expect(screen.getByText("Maktab tayyorgarligi")).toBeTruthy();
    expect(screen.getByText("Tasdiqlash navbati")).toBeTruthy();
    expect(screen.getByText("Moliya holati")).toBeTruthy();
    expect(screen.getByText("Ta'lim holati")).toBeTruthy();
  });

  it('shows ZONE B — Delegated Operations section', () => {
    render(React.createElement(DirectorDashboard), { wrapper: Wrapper });
    expect(screen.getByText("O'rinbosar (VP)")).toBeTruthy();
    expect(screen.getByText('Filial admin')).toBeTruthy();
    expect(screen.getAllByText("Moliya bo'limi").length).toBeGreaterThan(0);
  });

  it('shows ZONE C — Strategic Visibility sections', () => {
    render(React.createElement(DirectorDashboard), { wrapper: Wrapper });
    expect(screen.getByText("Muhim ogohlantirishlar")).toBeTruthy();
    expect(screen.getByText('Bugun')).toBeTruthy();
  });

  it('shows ownership badges on executive cards', () => {
    render(React.createElement(DirectorDashboard), { wrapper: Wrapper });
    expect(screen.getAllByText("Sizning vazifangiz").length).toBeGreaterThan(0);
    expect(screen.getAllByText("VP bajaradi").length).toBeGreaterThan(0);
    expect(screen.getAllByText('Filial admin bajaradi').length).toBeGreaterThan(0);
    expect(screen.getAllByText("Moliya bo'limi").length).toBeGreaterThan(0);
  });

  it('shows Quick Actions section with curated routes and ownership badges', () => {
    render(React.createElement(DirectorDashboard), { wrapper: Wrapper });
    expect(screen.getByText('Tezkor harakatlar')).toBeTruthy();

    const expectedActions = [
      'Tasdiqlash inbox',
      'Filiallar',
      'Xodimlar',
      'Foydalanuvchilar',
      'Ish haqi',
      'Hisobotlar',
      'Operatsion markaz',
      'Sozlamalar',
    ];

    for (const label of expectedActions) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('does NOT show fake AI metric labels when data unavailable', () => {
    render(React.createElement(DirectorDashboard), { wrapper: Wrapper });
    expect(screen.queryByText(/AI Tahlil/i)).toBeFalsy();
    expect(screen.queryByText(/EduCoin/i)).toBeFalsy();
    expect(screen.queryByText(/Analitik xavf/i)).toBeFalsy();
  });

  it('shows KPI snapshot card linking to /dashboard/kpi', () => {
    render(React.createElement(DirectorDashboard), { wrapper: Wrapper });
    const kpiHeading = screen.getByText('KPI');
    expect(kpiHeading).toBeTruthy();
    const kpiLink = kpiHeading.closest('a');
    expect(kpiLink).toBeTruthy();
    expect(kpiLink?.getAttribute('href')).toBe('/dashboard/kpi');
  });
});
