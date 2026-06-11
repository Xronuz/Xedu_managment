import { SetMetadata } from '@nestjs/common';

export const REQUIRES_MODULE_KEY = 'requiresModule';

/**
 * Controller (yoki handler) qaysi maktab moduliga tegishli ekanini belgilaydi.
 * ModuleAccessGuard shu metadata bo'yicha maktabda modul yoqilganini tekshiradi.
 *
 * @example
 *   @RequiresModule('payments')
 *   @UseGuards(JwtAuthGuard, RolesGuard, ModuleAccessGuard)
 *   export class PaymentsController {}
 */
export const RequiresModule = (moduleName: string) =>
  SetMetadata(REQUIRES_MODULE_KEY, moduleName);
