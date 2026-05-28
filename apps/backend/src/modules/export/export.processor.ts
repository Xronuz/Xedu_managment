import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job } from 'bullmq';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ExportService } from './export.service';
import { EXPORT_QUEUE, ExportJobType, ExportJobData } from '@/common/queue/queue.constants';
import { ExportJobStatus } from '@prisma/client';
import { recordQueueFailure } from '@/common/telemetry/pilot-telemetry';

@Injectable()
export class ExportProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExportProcessor.name);
  private worker: Worker | null = null;

  constructor(
    private readonly exportService: ExportService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    try {
      this.worker = new Worker(
        EXPORT_QUEUE,
        async (job: Job) => this.handleJob(job),
        {
          connection: {
            host: this.config.get('REDIS_HOST', 'localhost'),
            port: this.config.get<number>('REDIS_PORT', 6379),
            password: this.config.get('REDIS_PASSWORD') || undefined,
            db: this.config.get<number>('REDIS_DB', 0),
          },
          concurrency: 2,
        },
      );

      this.worker.on('completed', (job) => {
        this.logger.debug(`Export job bajarildi: ID=${job.id}`);
      });

      this.worker.on('failed', (job, err) => {
        this.logger.error(`Export job xato: ID=${job?.id} — ${err.message}`);
      });

      this.worker.on('error', (err) => {
        this.logger.error(`Export Worker xatosi (Redis muammo bo'lishi mumkin): ${err.message}`);
      });

      this.logger.log('Export Worker ishga tushdi');
    } catch (err: any) {
      this.logger.warn(
        `Export Worker ishga tushmadi (Redis mavjud emas): ${err.message}. ` +
        `Eksportlar sync rejimda ishlaydi.`,
      );
      this.worker = null;
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async handleJob(job: Job): Promise<void> {
    if (job.name !== ExportJobType.PROCESS_EXPORT) {
      this.logger.warn(`Noma'lum export job turi: ${job.name}`);
      return;
    }

    const data = job.data as ExportJobData;
    const cid = data.correlationId || 'no-cid';
    const exportJob = await this.prisma.exportJob.findUnique({ where: { id: data.jobId } });

    if (!exportJob) {
      this.logger.error(`[${cid}] Export job topilmadi: ${data.jobId}`);
      return;
    }

    if (exportJob.status === ExportJobStatus.cancelled) {
      this.logger.log(`[${cid}] Export job bekor qilingan, o'tkazib yuborildi: ${data.jobId}`);
      return;
    }

    this.logger.log(`[${cid}] Export job boshlandi: ${data.jobId} (${exportJob.entity})`);
    try {
      await this.exportService.processJob(exportJob, data.user, data.filters);
      this.logger.log(`[${cid}] Export job tugadi: ${data.jobId}`);
    } catch (err) {
      recordQueueFailure();
      this.logger.error(`[${cid}] Export job ${data.jobId} failed`, err);
      await this.prisma.exportJob.update({
        where: { id: data.jobId },
        data: { status: ExportJobStatus.failed, error: (err as Error).message },
      });
    }
  }
}
