import { Module } from '@nestjs/common';
import { EngagementConfigService } from './engagement-config.service';
import { AchievementService } from './achievement.service';
import { AccountabilityService } from './accountability.service';
import { RecoveryService } from './recovery.service';
import { ExamEngagementService } from './exam-engagement.service';
import { EngagementAnalyticsService } from './engagement-analytics.service';
import { EngagementController } from './engagement.controller';
import { RequireEngagementGuard } from './require-engagement.guard';
import { AuditLogService } from '@/common/audit/audit-log.service';

@Module({
  controllers: [EngagementController],
  providers: [
    EngagementConfigService,
    AchievementService,
    AccountabilityService,
    RecoveryService,
    ExamEngagementService,
    EngagementAnalyticsService,
    RequireEngagementGuard,
    AuditLogService,
  ],
  exports: [
    EngagementConfigService,
    AchievementService,
    AccountabilityService,
    RecoveryService,
    ExamEngagementService,
    EngagementAnalyticsService,
    RequireEngagementGuard,
    AuditLogService,
  ],
})
export class EngagementModule {}
