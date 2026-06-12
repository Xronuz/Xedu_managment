import { Module } from '@nestjs/common';
import { KpiService } from './kpi.service';
import { KpiSnapshotService } from './kpi-snapshot.service';
import { KpiController } from './kpi.controller';
import { NotificationsModule } from '@/modules/notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [KpiController],
  providers: [KpiService, KpiSnapshotService],
  exports: [KpiService, KpiSnapshotService],
})
export class KpiModule {}
