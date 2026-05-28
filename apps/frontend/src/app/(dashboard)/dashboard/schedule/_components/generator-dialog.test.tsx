/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GeneratorDialog } from './generator-dialog';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

// Mock schedule-generator API
const mockAdvancedGenerate = vi.fn();
const mockGetSolverRun = vi.fn();
const mockGenerate = vi.fn();
const mockCommit = vi.fn();

vi.mock('@/lib/api/schedule-generator', () => ({
  scheduleGeneratorApi: {
    generate: (...args: any[]) => mockGenerate(...args),
    advancedGenerate: (...args: any[]) => mockAdvancedGenerate(...args),
    getSolverRun: (...args: any[]) => mockGetSolverRun(...args),
    commit: (...args: any[]) => mockCommit(...args),
  },
}));

// Mock useToast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock lucide-react icons
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual<typeof import('lucide-react')>('lucide-react');
  const span = (testid: string) => () => React.createElement('span', { 'data-testid': testid });
  return {
    ...actual,
    Calendar: span('icon-calendar'),
    Loader2: span('icon-loader'),
    CheckCircle2: span('icon-check'),
    XCircle: span('icon-xcircle'),
    AlertTriangle: span('icon-alert'),
    Save: span('icon-save'),
    Trash2: span('icon-trash'),
    BrainCircuit: span('icon-brain'),
    Zap: span('icon-zap'),
    Timer: span('icon-timer'),
  };
});

// Mock conflict-modal
vi.mock('./conflict-modal', () => ({
  ConflictModal: () => React.createElement('div', { 'data-testid': 'conflict-modal' }),
  ConflictDetail: () => React.createElement('div'),
}));

describe('GeneratorDialog async states', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('prevents duplicate generate clicks while pending', async () => {
    // Never resolve so we stay in pending state
    mockAdvancedGenerate.mockImplementation(() => new Promise(() => {}));

    render(
      React.createElement(GeneratorDialog, {
        open: true,
        onOpenChange: vi.fn(),
        branchId: 'branch-1',
      }),
      { wrapper: Wrapper }
    );

    // Select hybrid strategy
    const hybridBtn = screen.getByText('Hybrid').closest('button');
    expect(hybridBtn).toBeTruthy();
    if (hybridBtn) fireEvent.click(hybridBtn);

    const generateBtn = screen.getByText('Jadval yaratish').closest('button');
    expect(generateBtn).toBeTruthy();

    // Click once
    if (generateBtn) fireEvent.click(generateBtn);

    // Button should be disabled / show loading
    await waitFor(() => {
      expect(screen.queryByText('Jadval yaratish')).toBeFalsy();
    });
  });

  it('renders running state after hybrid generate is submitted', async () => {
    mockAdvancedGenerate.mockResolvedValue({
      id: 'run-1',
      status: 'running',
      branchId: 'branch-1',
      strategy: 'hybrid',
    });

    mockGetSolverRun.mockResolvedValue({
      id: 'run-1',
      status: 'running',
      branchId: 'branch-1',
      strategy: 'hybrid',
    });

    render(
      React.createElement(GeneratorDialog, {
        open: true,
        onOpenChange: vi.fn(),
        branchId: 'branch-1',
      }),
      { wrapper: Wrapper }
    );

    // Select hybrid strategy
    const hybridBtn = screen.getByText('Hybrid').closest('button');
    expect(hybridBtn).toBeTruthy();
    if (hybridBtn) fireEvent.click(hybridBtn);

    const generateBtn = screen.getByText('Jadval yaratish').closest('button');
    expect(generateBtn).toBeTruthy();
    if (generateBtn) fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText('Jadval tayyorlanmoqda...')).toBeTruthy();
    });
  });

  it('renders failed state when solver run fails', async () => {
    mockAdvancedGenerate.mockResolvedValue({
      id: 'run-2',
      status: 'running',
      branchId: 'branch-1',
      strategy: 'hybrid',
    });

    mockGetSolverRun.mockResolvedValue({
      id: 'run-2',
      status: 'failed',
      branchId: 'branch-1',
      strategy: 'hybrid',
      metadata: { error: 'Timeout: 30s limit exceeded' },
    });

    render(
      React.createElement(GeneratorDialog, {
        open: true,
        onOpenChange: vi.fn(),
        branchId: 'branch-1',
      }),
      { wrapper: Wrapper }
    );

    // Select hybrid
    const hybridBtn = screen.getByText('Hybrid').closest('button');
    expect(hybridBtn).toBeTruthy();
    if (hybridBtn) fireEvent.click(hybridBtn);

    const generateBtn = screen.getByText('Jadval yaratish').closest('button');
    expect(generateBtn).toBeTruthy();
    if (generateBtn) fireEvent.click(generateBtn);

    // Fast-forward past the immediate check and two poll intervals
    await vi.advanceTimersByTimeAsync(10000);

    await waitFor(() => {
      expect(screen.getByText('Generatsiya amalga oshmadi')).toBeTruthy();
    });

    expect(screen.getByText('Timeout: 30s limit exceeded')).toBeTruthy();
  });

  it('shows result when solver run completes', async () => {
    mockAdvancedGenerate.mockResolvedValue({
      id: 'run-3',
      status: 'running',
      branchId: 'branch-1',
      strategy: 'hybrid',
    });

    mockGetSolverRun.mockResolvedValue({
      id: 'run-3',
      status: 'completed',
      branchId: 'branch-1',
      strategy: 'hybrid',
      demandsCount: 10,
      placedCount: 8,
      failureCount: 2,
      metadata: {
        proposedSlots: [
          { id: 'slot-1', classId: 'c1', subjectId: 's1', teacherId: 't1', dayOfWeek: 'monday', timeSlot: 1, startTime: '08:00', endTime: '08:45' },
        ],
        failures: [],
        diagnostics: { byReason: {}, byTeacher: {}, byClass: {}, bySubject: {} },
      },
    });

    render(
      React.createElement(GeneratorDialog, {
        open: true,
        onOpenChange: vi.fn(),
        branchId: 'branch-1',
      }),
      { wrapper: Wrapper }
    );

    const hybridBtn = screen.getByText('Hybrid').closest('button');
    expect(hybridBtn).toBeTruthy();
    if (hybridBtn) fireEvent.click(hybridBtn);

    const generateBtn = screen.getByText('Jadval yaratish').closest('button');
    expect(generateBtn).toBeTruthy();
    if (generateBtn) fireEvent.click(generateBtn);

    await vi.advanceTimersByTimeAsync(5000);

    await waitFor(() => {
      expect(screen.getByText('Jami talab')).toBeTruthy();
    });

    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });
});
