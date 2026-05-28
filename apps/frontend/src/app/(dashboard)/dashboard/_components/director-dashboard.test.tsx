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
  useAuthStore: () => ({ activeBranchId: null }),
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

describe('DirectorDashboard (Phase 2 restoration)', () => {
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
    const els = screen.getAllByText('Operatsion markaz');
    expect(els.length).toBeGreaterThan(0);
  });

  it('shows Approval Preview section', () => {
    render(React.createElement(DirectorDashboard), { wrapper: Wrapper });
    const elements = screen.getAllByText('Tasdiqlash inbox');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('shows Quick Actions section with curated routes', () => {
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
      const els = screen.getAllByText(label);
      expect(els.length).toBeGreaterThan(0);
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
