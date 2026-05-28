/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GeneratorDialog } from './generator-dialog';

const mockAdvancedGenerate = vi.fn();
const mockGetSolverRun = vi.fn();

vi.mock('@/lib/api/schedule-generator', () => ({
  scheduleGeneratorApi: {
    generate: vi.fn(),
    advancedGenerate: (...args: any[]) => mockAdvancedGenerate(...args),
    getSolverRun: (...args: any[]) => mockGetSolverRun(...args),
    commit: vi.fn(),
  },
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

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

vi.mock('./conflict-modal', () => ({
  ConflictModal: () => React.createElement('div', { 'data-testid': 'conflict-modal' }),
  ConflictDetail: () => React.createElement('div'),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('GeneratorDialog cleanup & safety', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should stop polling when dialog closes (unmount safety)', async () => {
    mockAdvancedGenerate.mockResolvedValue({
      id: 'run-1', status: 'running', branchId: 'branch-1', strategy: 'hybrid',
    });

    // getSolverRun never resolves — simulates a hung poll
    mockGetSolverRun.mockImplementation(() => new Promise(() => {}));

    const { unmount } = render(
      React.createElement(GeneratorDialog, {
        open: true,
        onOpenChange: vi.fn(),
        branchId: 'branch-1',
      }),
      { wrapper: Wrapper }
    );

    // Select hybrid and start
    const hybridBtn = screen.getByText('Hybrid').closest('button');
    expect(hybridBtn).toBeTruthy();
    if (hybridBtn) fireEvent.click(hybridBtn);

    const generateBtn = screen.getByText('Jadval yaratish').closest('button');
    expect(generateBtn).toBeTruthy();
    if (generateBtn) fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText('Jadval tayyorlanmoqda...')).toBeTruthy();
    });

    // Unmount should not throw and should clear intervals
    expect(() => unmount()).not.toThrow();

    // Advance time — no pending timers should error
    await vi.advanceTimersByTimeAsync(30000);
    expect(mockGetSolverRun).toHaveBeenCalledTimes(1); // only the immediate check
  });

  it('should handle slow network (poll continues until timeout)', async () => {
    mockAdvancedGenerate.mockResolvedValue({
      id: 'run-2', status: 'running', branchId: 'branch-1', strategy: 'hybrid',
    });

    // Slow responses that eventually fail
    let callCount = 0;
    mockGetSolverRun.mockImplementation(async () => {
      callCount++;
      await new Promise(r => setTimeout(r, 500));
      return { id: 'run-2', status: 'running' };
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

    await waitFor(() => {
      expect(screen.getByText('Jadval tayyorlanmoqda...')).toBeTruthy();
    });

    // Advance past multiple poll intervals
    await vi.advanceTimersByTimeAsync(15000);

    // Should have polled multiple times
    expect(callCount).toBeGreaterThanOrEqual(3);
  });
});
