import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job } from 'bullmq';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AdvancedSolverService } from './advanced-solver.service';
import { SOLVER_QUEUE, SolverJobType, SolverJobData } from '@/common/queue/queue.constants';
import { SolverRunStatus } from '@eduplatform/types';
import { recordQueueFailure } from '@/common/telemetry/pilot-telemetry';

@Injectable()
export class SolverProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SolverProcessor.name);
  private worker: Worker | null = null;

  constructor(
    private readonly advancedSolver: AdvancedSolverService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    try {
      this.worker = new Worker(
        SOLVER_QUEUE,
        async (job: Job) => this.handleJob(job),
        {
          connection: {
            host: this.config.get('REDIS_HOST', 'localhost'),
            port: this.config.get<number>('REDIS_PORT', 6379),
            password: this.config.get('REDIS_PASSWORD') || undefined,
            db: this.config.get<number>('REDIS_DB', 0),
          },
          concurrency: 1, // CPU-bound: only one solver at a time per worker
        },
      );

      this.worker.on('completed', (job) => {
        this.logger.debug(`Solver job bajarildi: ID=${job.id}`);
      });

      this.worker.on('failed', (job, err) => {
        this.logger.error(`Solver job xato: ID=${job?.id} — ${err.message}`);
      });

      this.worker.on('error', (err) => {
        this.logger.error(`Solver Worker xatosi (Redis muammo bo'lishi mumkin): ${err.message}`);
      });

      this.logger.log('Solver Worker ishga tushdi');
    } catch (err: any) {
      this.logger.warn(
        `Solver Worker ishga tushmadi (Redis mavjud emas): ${err.message}. ` +
        `Solverlar sync rejimda ishlaydi.`,
      );
      this.worker = null;
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async handleJob(job: Job): Promise<void> {
    if (job.name !== SolverJobType.PROCESS_SOLVER) {
      this.logger.warn(`Noma'lum solver job turi: ${job.name}`);
      return;
    }

    const data = job.data as SolverJobData;
    const cid = data.correlationId || 'no-cid';
    const run = await this.prisma.solverRun.findUnique({ where: { id: data.runId } });

    if (!run) {
      this.logger.error(`[${cid}] Solver run topilmadi: ${data.runId}`);
      return;
    }

    if (run.status === SolverRunStatus.CANCELLED) {
      this.logger.log(`[${cid}] Solver run bekor qilingan, o'tkazib yuborildi: ${data.runId}`);
      return;
    }

    this.logger.log(`[${cid}] Solver run boshlandi: ${data.runId} (${run.strategy})`);
    try {
      await this.advancedSolver.run(data.dto, data.user, data.runId);
      this.logger.log(`[${cid}] Solver run tugadi: ${data.runId}`);
    } catch (err) {
      recordQueueFailure();
      this.logger.error(`[${cid}] Solver run ${data.runId} failed`, err);
      await this.prisma.solverRun.update({
        where: { id: data.runId },
        data: { status: SolverRunStatus.CANCELLED, metadata: { error: (err as Error).message } },
      });
    }
  }
}
