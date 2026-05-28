import { Test, TestingModule } from '@nestjs/testing';
import { SolverProcessor } from './solver.processor';
import { AdvancedSolverService } from './advanced-solver.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SolverRunStatus } from '@eduplatform/types';
import { JwtPayload, UserRole } from '@eduplatform/types';

const mockUser: JwtPayload = {
  sub: 'user-1', email: 'test@test.com', role: UserRole.DIRECTOR,
  schoolId: 'school-1', branchId: 'branch-1', isSuperAdmin: false,
};

const mockSolverService = {
  run: jest.fn(),
};

describe('SolverProcessor — failure simulation', () => {
  let processor: SolverProcessor;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      solverRun: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SolverProcessor,
        { provide: PrismaService, useValue: prisma },
        { provide: AdvancedSolverService, useValue: mockSolverService },
        { provide: ConfigService, useValue: { get: jest.fn((key: string, def: any) => def) } },
      ],
    }).compile();

    processor = module.get<SolverProcessor>(SolverProcessor);
    jest.clearAllMocks();
  });

  async function handleJob(jobData: any) {
    return (processor as any).handleJob({
      id: 'bull-job-1',
      name: 'process_solver',
      data: jobData,
    });
  }

  it('should run solver successfully for a normal job', async () => {
    prisma.solverRun.findUnique.mockResolvedValue({
      id: 'run-1', status: SolverRunStatus.RUNNING,
    });
    mockSolverService.run.mockResolvedValue({ placed: 10, failed: 0 });

    await handleJob({ runId: 'run-1', dto: { branchId: 'branch-1' }, user: mockUser });

    expect(mockSolverService.run).toHaveBeenCalledWith(
      { branchId: 'branch-1' }, mockUser, 'run-1',
    );
    expect(prisma.solverRun.update).not.toHaveBeenCalled();
  });

  it('should skip cancelled run without solving', async () => {
    prisma.solverRun.findUnique.mockResolvedValue({
      id: 'run-1', status: SolverRunStatus.CANCELLED,
    });

    await handleJob({ runId: 'run-1', dto: {}, user: mockUser });

    expect(mockSolverService.run).not.toHaveBeenCalled();
  });

  it('should mark run as failed when solver throws', async () => {
    prisma.solverRun.findUnique.mockResolvedValue({
      id: 'run-1', status: SolverRunStatus.RUNNING,
    });
    mockSolverService.run.mockRejectedValue(new Error('Timeout: event loop blocked'));

    await handleJob({ runId: 'run-1', dto: {}, user: mockUser });

    expect(prisma.solverRun.update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: { status: SolverRunStatus.CANCELLED, metadata: { error: 'Timeout: event loop blocked' } },
    });
  });

  it('should silently ignore missing run record', async () => {
    prisma.solverRun.findUnique.mockResolvedValue(null);

    await handleJob({ runId: 'missing-run', dto: {}, user: mockUser });

    expect(mockSolverService.run).not.toHaveBeenCalled();
    expect(prisma.solverRun.update).not.toHaveBeenCalled();
  });

  it('should ignore unknown job types', async () => {
    await (processor as any).handleJob({
      id: 'bull-job-1',
      name: 'unknown_type',
      data: {},
    });

    expect(prisma.solverRun.findUnique).not.toHaveBeenCalled();
  });

  it('should handle malformed payload gracefully', async () => {
    prisma.solverRun.findUnique.mockResolvedValue({
      id: 'run-1', status: SolverRunStatus.RUNNING,
    });
    mockSolverService.run.mockRejectedValue(new TypeError('Cannot read properties of undefined'));

    await handleJob({ runId: 'run-1', dto: null, user: mockUser });

    expect(prisma.solverRun.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'run-1' },
      data: expect.objectContaining({ status: SolverRunStatus.CANCELLED }),
    }));
  });
});
