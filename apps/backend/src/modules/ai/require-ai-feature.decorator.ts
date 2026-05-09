import { SetMetadata } from '@nestjs/common';

export const REQUIRE_AI_FEATURE_KEY = 'require_ai_feature';

export const RequireAiFeature = (feature: string) =>
  SetMetadata(REQUIRE_AI_FEATURE_KEY, feature);
