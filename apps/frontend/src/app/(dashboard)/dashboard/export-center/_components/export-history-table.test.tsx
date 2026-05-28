/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ExportHistoryTable } from './export-history-table';
import type { ExportJob } from '@/lib/api/export-center';

const mockJobs = (status: ExportJob['status']): ExportJob[] => [
  {
    id: 'job-1',
    entity: 'schedules',
    format: 'xlsx',
    status,
    progress: status === 'completed' ? 100 : status === 'processing' ? 50 : 0,
    fileUrl: status === 'completed' ? 'https://example.com/file.xlsx' : null,
    error: status === 'failed' ? 'DB timeout' : null,
    createdAt: '2026-05-21T10:00:00Z',
    startedAt: null,
    completedAt: status === 'completed' ? '2026-05-21T10:01:00Z' : null,
    createdBy: 'user-1',
  },
];

// Mock lucide-react icons to avoid SVG rendering issues in jsdom
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual<typeof import('lucide-react')>('lucide-react');
  const span = (testid: string) => () => React.createElement('span', { 'data-testid': testid });
  return {
    ...actual,
    Download: span('icon-download'),
    MoreHorizontal: span('icon-more'),
    XCircle: span('icon-xcircle'),
    Clock: span('icon-clock'),
    CheckCircle: span('icon-check'),
    AlertCircle: span('icon-alert'),
    Loader2: span('icon-loader'),
    FileSpreadsheet: span('icon-sheet'),
    FileJson: span('icon-json'),
    FileText: span('icon-text'),
    RotateCcw: span('icon-rotate'),
    Eye: span('icon-eye'),
    Filter: span('icon-filter'),
    X: span('icon-x'),
  };
});

// Mock useToast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('ExportHistoryTable async states', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders queued state', () => {
    render(
      React.createElement(ExportHistoryTable, {
        jobs: mockJobs('queued'),
        isLoading: false,
        onRefresh: vi.fn(),
      })
    );

    expect(screen.getByText('Navbatda')).toBeTruthy();
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('renders processing state', () => {
    render(
      React.createElement(ExportHistoryTable, {
        jobs: mockJobs('processing'),
        isLoading: false,
        onRefresh: vi.fn(),
      })
    );

    expect(screen.getByText('Jarayonda')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('renders completed state', () => {
    render(
      React.createElement(ExportHistoryTable, {
        jobs: mockJobs('completed'),
        isLoading: false,
        onRefresh: vi.fn(),
      })
    );

    expect(screen.getByText('Tayyor')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('renders failed state with error message', () => {
    render(
      React.createElement(ExportHistoryTable, {
        jobs: mockJobs('failed'),
        isLoading: false,
        onRefresh: vi.fn(),
      })
    );

    expect(screen.getByText('Xatolik')).toBeTruthy();
    expect(screen.getByText('DB timeout')).toBeTruthy();
  });

  it('renders cancelled state', () => {
    render(
      React.createElement(ExportHistoryTable, {
        jobs: mockJobs('cancelled'),
        isLoading: false,
        onRefresh: vi.fn(),
      })
    );

    expect(screen.getByText('Bekor qilingan')).toBeTruthy();
  });
});
