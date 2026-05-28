import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AdvancedSolverService } from './advanced-solver.service';
import { SOLVER_QUEUE, SolverJobType } from '@/common/queue/queue.constants';
import { JwtPayload } from '@eduplatform/types';
import { SolverRunStatus } from '@eduplatform/types';

@Injectable()
export class SolverQueueService {
  private readonly logger = new Logger(SolverQueueService.name);

  constructor(
    @Optional() @Inject(SOLVER_QUEUE) private readonly queue: Queue | null,
    private readonly advancedSolver: AdvancedSolverService,
    private readonly prisma: PrismaService,
  ) {}

  async addSolverJob(runId: string, dto: Record<string, any>, user: JwtPayload, correlationId?: string): Promise<void> {
    if (!this.queue) {
      this.logger.warn(`[${correlationId || 'no-cid'}] Queue mavjud emas — solver sync rejimda ishlaydi: ${runId}`);
      try {
        await this.advancedSolver.run(dto, user, runId);
      } catch (err) {
        this.logger.error(`[${correlationId || 'no-cid'}] Solver run ${runId} failed (sync fallback)`, err);
        await this.prisma.solverRun.update({
          where: { id: runId },
          data: { status: SolverRunStatus.CANCELLED, metadata: { error: (err as Error).message } },
        });
      }
      return;
    }

    try {
      await this.queue.add(SolverJobType.PROCESS_SOLVER, { runId, dto, user, correlationId });
    } catch (err) {
      this.logger.error(`[${correlationId || 'no-cid'}] Queue ga solver job qo'shishda xato: ${runId}`, err);
    }
  }
}
