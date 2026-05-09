import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiProviderService } from './ai-provider.service';
import { AiUsageService } from './ai-usage.service';
import { AiQuotaService } from './ai-quota.service';
import { AiEntitlementService } from './ai-entitlement.service';
import { RequireAiFeatureGuard } from './require-ai-feature.guard';
import { EngagementModule } from '@/modules/engagement/engagement.module';

@Module({
  imports: [EngagementModule],
  controllers: [AiController],
  providers: [
    AiProviderService,
    AiUsageService,
    AiQuotaService,
    AiEntitlementService,
    RequireAiFeatureGuard,
  ],
  exports: [
    AiProviderService,
    AiUsageService,
    AiQuotaService,
    AiEntitlementService,
    RequireAiFeatureGuard,
  ],
})
export class AiModule {}
