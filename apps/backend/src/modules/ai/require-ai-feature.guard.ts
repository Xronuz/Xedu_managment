import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AiEntitlementService } from './ai-entitlement.service';
import { REQUIRE_AI_FEATURE_KEY } from './require-ai-feature.decorator';

@Injectable()
export class RequireAiFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlementService: AiEntitlementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<string>(REQUIRE_AI_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!feature) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.schoolId) {
      throw new ForbiddenException('Maktab identifikatori topilmadi');
    }

    const result = await this.entitlementService.canUseFeature(user, feature);

    if (!result.allowed) {
      throw new ForbiddenException(result.reason ?? 'Bu xususiyatdan foydalanish huquqi yo‘q');
    }

    // Quota info'ni response header'ga qo'yish
    if (result.quotaRemaining !== undefined) {
      const response = context.switchToHttp().getResponse();
      response.setHeader('X-AI-Quota-Remaining', String(result.quotaRemaining));
      response.setHeader('X-AI-Tier', String(result.tier ?? 'free'));
    }

    return true;
  }
}
