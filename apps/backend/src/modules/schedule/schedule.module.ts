import { Module } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { ScheduleGeneratorService } from './schedule-generator.service';
import { AdvancedSolverService } from './advanced-solver.service';
import { ScheduleExportService } from './schedule-export.service';
import { ScheduleRepairService } from './schedule-repair.service';
import { EventsModule } from '@/modules/gateway/events.module';
import { ConflictDetectorService } from '@/common/utils/conflict-detector';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { PeriodsModule } from '@/modules/periods/periods.module';

@Module({
  imports: [PrismaModule, EventsModule, PeriodsModule],
  controllers: [ScheduleController],
  providers: [ScheduleService, ScheduleGeneratorService, AdvancedSolverService, ScheduleExportService, ConflictDetectorService, ScheduleRepairService],
  exports: [ScheduleService, ScheduleGeneratorService, AdvancedSolverService, ScheduleExportService, ConflictDetectorService, ScheduleRepairService],
})
export class ScheduleModule {}
