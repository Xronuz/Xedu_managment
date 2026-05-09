import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EngagementConfigService } from './engagement-config.service';
import { REQUIRE_ENGAGEMENT_KEY } from './require-engagement.decorator';
import { JwtPayload } from '@eduplatform/types';

@Injectable()
export class RequireEngagementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly engagementConfig: EngagementConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<string>(REQUIRE_ENGAGEMENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!feature) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user?.schoolId) {
      throw new ForbiddenException('Maktab identifikatori topilmadi');
    }

    const enabled = await this.engagementConfig.isEnabled(user.schoolId);
    if (!enabled) {
      throw new ForbiddenException('Engagement tizimi bu maktabda yoqilmagan');
    }

    // Agar ma'lum bir xususiyat talab qilingan bo'lsa
    if (feature !== 'engagement_enabled') {
      const featureEnabled = await this.engagementConfig.get(
        user.schoolId,
        feature as any,
      );
      if (!featureEnabled) {
        throw new ForbiddenException('Bu xususiyat maktabda yoqilmagan');
      }
    }

    return true;
  }
}
