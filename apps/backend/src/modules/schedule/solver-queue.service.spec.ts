import { Test, TestingModule } from '@nestjs/testing';
import { SolverQueueService } from './solver-queue.service';
import { AdvancedSolverService } from './advanced-solver.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SOLVER_QUEUE } from '@/common/queue/queue.constants';
import { SolverRunStatus } from '@eduplatform/types';
import { JwtPayload, UserRole } from '@eduplatform/types';

const mockUser: JwtPayload = {
  sub: 'user-1', email: 'test@test.com', role: UserRole.DIRECTOR,
  schoolId: 'school-1', branchId: 'branch-1', isSuperAdmin: false,
};

const mockSolverService = {
  run: jest.fn(),
};

describe('SolverQueueService — Redis-down fallback & resilience', () => {
  let service: SolverQueueService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      solverRun: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SolverQueueService,
        { provide: PrismaService, useValue: prisma },
        { provide: AdvancedSolverService, useValue: mockSolverService },
        { provide: SOLVER_QUEUE, useValue: null }, // Redis unavailable
      ],
    }).compile();

    service = module.get<SolverQueueService>(SolverQueueService);
    jest.clearAllMocks();
  });

  it('should fall back to sync solving when Redis is down', async () => {
    mockSolverService.run.mockResolvedValue({ placed: 10, failed: 0 });

    await service.addSolverJob('run-1', { branchId: 'branch-1' }, mockUser);

    expect(mockSolverService.run).toHaveBeenCalledWith(
      { branchId: 'branch-1' }, mockUser, 'run-1',
    );
  });

  it('should mark run failed when sync fallback throws', async () => {
    mockSolverService.run.mockRejectedValue(new Error('Memory exceeded'));

    await service.addSolverJob('run-1', {}, mockUser);

    expect(prisma.solverRun.update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: { status: SolverRunStatus.CANCELLED, metadata: { error: 'Memory exceeded' } },
    });
  });

  it('should handle timeout in sync fallback', async () => {
    mockSolverService.run.mockRejectedValue(new Error('Event loop blocked for 30s'));

    await service.addSolverJob('run-1', { timeoutMs: 1 }, mockUser);

    expect(prisma.solverRun.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'run-1' },
      data: expect.objectContaining({ status: SolverRunStatus.CANCELLED }),
    }));
  });
});
