import { Module } from '@nestjs/common';
import { HomeworkController } from './homework.controller';
import { HomeworkService } from './homework.service';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { EngagementModule } from '@/modules/engagement/engagement.module';

@Module({
  imports: [NotificationsModule, EngagementModule],
  controllers: [HomeworkController],
  providers: [HomeworkService],
  exports: [HomeworkService],
})
export class HomeworkModule {}
