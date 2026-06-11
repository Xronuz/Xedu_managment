import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '@eduplatform/types';
import { ModuleFlagsService } from '@/common/module-flags/module-flags.service';
import { REQUIRES_MODULE_KEY } from '@/common/decorators/requires-module.decorator';

/**
 * Maktab moduli o'chirilgan bo'lsa so'rovni 403 bilan to'xtatadi.
 *
 * - @RequiresModule(...) metadata bo'lmasa — o'tkazadi.
 * - request.user yo'q (public endpoint, masalan to'lov webhook'lari) — o'tkazadi.
 * - super_admin / schoolId'siz foydalanuvchi — o'tkazadi.
 * - Aks holda ModuleFlagsService (Redis kesh) orqali tekshiradi.
 *
 * JwtAuthGuard'dan KEYIN turishi shart: @UseGuards(JwtAuthGuard, RolesGuard, ModuleAccessGuard)
 */
@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly moduleFlags: ModuleFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const moduleName = this.reflector.getAllAndOverride<string>(REQUIRES_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!moduleName) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    if (!user || !user.schoolId) return true; // public yoki platforma darajasi

    const disabled = await this.moduleFlags.isModuleDisabled(user.schoolId, moduleName);
    if (disabled) {
      throw new ForbiddenException('Bu modul maktabingiz uchun yoqilmagan. Administratsiya bilan bog‘laning.');
    }
    return true;
  }
}
