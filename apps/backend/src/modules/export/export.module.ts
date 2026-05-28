import { Module } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { ExportProcessor } from './export.processor';
import { ExportQueueService } from './export-queue.service';
import { QueueModule } from '@/common/queue/queue.module';

@Module({
  imports: [QueueModule],
  controllers: [ExportController],
  providers: [ExportService, ExportProcessor, ExportQueueService],
  exports: [ExportService, ExportQueueService],
})
export class ExportModule {}
