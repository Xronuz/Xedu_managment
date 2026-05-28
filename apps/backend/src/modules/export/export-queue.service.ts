import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ExportService, ExportFilters } from './export.service';
import { EXPORT_QUEUE, ExportJobType } from '@/common/queue/queue.constants';
import { JwtPayload } from '@eduplatform/types';
import { ExportJobStatus } from '@prisma/client';

@Injectable()
export class ExportQueueService {
  private readonly logger = new Logger(ExportQueueService.name);

  constructor(
    @Optional() @Inject(EXPORT_QUEUE) private readonly queue: Queue | null,
    private readonly exportService: ExportService,
    private readonly prisma: PrismaService,
  ) {}

  async addExportJob(jobId: string, user: JwtPayload, filters: ExportFilters, correlationId?: string): Promise<void> {
    if (!this.queue) {
      this.logger.warn(`[${correlationId || 'no-cid'}] Queue mavjud emas — eksport job sync rejimda ishlaydi: ${jobId}`);
      const job = await this.prisma.exportJob.findUnique({ where: { id: jobId } });
      if (!job) {
        this.logger.error(`[${correlationId || 'no-cid'}] Export job topilmadi: ${jobId}`);
        return;
      }
      try {
        await this.exportService.processJob(job, user, filters);
      } catch (err) {
        this.logger.error(`[${correlationId || 'no-cid'}] Export job ${jobId} failed (sync fallback)`, err);
        await this.prisma.exportJob.update({
          where: { id: jobId },
          data: { status: ExportJobStatus.failed, error: (err as Error).message },
        });
      }
      return;
    }

    try {
      await this.queue.add(ExportJobType.PROCESS_EXPORT, { jobId, user, filters, correlationId });
    } catch (err) {
      this.logger.error(`[${correlationId || 'no-cid'}] Queue ga job qo'shishda xato: ${jobId}`, err);
    }
  }
}
