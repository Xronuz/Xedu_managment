import { SetMetadata } from '@nestjs/common';
import { EngagementConfigKey } from './engagement-config.service';

export const REQUIRE_ENGAGEMENT_KEY = 'require_engagement';

/**
 * Endpoint'ni engagement tizimi yoqilganligiga bog'laydi.
 * @param feature - Tekshiriladigan konfiguratsiya kaliti (ixtiyoriy)
 *
 * Masalan:
 * @RequireEngagement()              // engagement_enabled = true
 * @RequireEngagement('engagement_shop') // shop yoqilgan bo'lishi kerak
 */
export const RequireEngagement = (feature?: EngagementConfigKey) =>
  SetMetadata(REQUIRE_ENGAGEMENT_KEY, feature ?? 'engagement_enabled');
