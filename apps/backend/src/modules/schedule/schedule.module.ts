import { Module } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { ScheduleGeneratorService } from './schedule-generator.service';
import { AdvancedSolverService } from './advanced-solver.service';
import { ScheduleExportService } from './schedule-export.service';
import { ScheduleRepairService } from './schedule-repair.service';
import { TimetableAnalyticsService } from './timetable-analytics.service';
import { SolverQueueService } from './solver-queue.service';
import { SolverProcessor } from './solver.processor';
import { EventsModule } from '@/modules/gateway/events.module';
import { ConflictDetectorService } from '@/common/utils/conflict-detector';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { PeriodsModule } from '@/modules/periods/periods.module';
import { QueueModule } from '@/common/queue/queue.module';

@Module({
  imports: [PrismaModule, EventsModule, PeriodsModule, QueueModule],
  controllers: [ScheduleController],
  providers: [
    ScheduleService, ScheduleGeneratorService, AdvancedSolverService,
    ScheduleExportService, ConflictDetectorService, ScheduleRepairService,
    TimetableAnalyticsService, SolverQueueService, SolverProcessor,
  ],
  exports: [
    ScheduleService, ScheduleGeneratorService, AdvancedSolverService,
    ScheduleExportService, ConflictDetectorService, ScheduleRepairService,
    TimetableAnalyticsService, SolverQueueService,
  ],
})
export class ScheduleModule {}
