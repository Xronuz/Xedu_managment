import { Injectable, Logger, CanActivate, ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, JwtPayload } from '@eduplatform/types';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ANY_AUTHENTICATED_KEY } from '../decorators/any-authenticated.decorator';

/** Roles that indicate a school-scoped endpoint */
const SCHOOL_ROLES = new Set<UserRole>([
  UserRole.DIRECTOR,
  UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL,
  UserRole.TEACHER, UserRole.CLASS_TEACHER,
  UserRole.ACCOUNTANT, UserRole.LIBRARIAN,
  UserRole.STUDENT, UserRole.PARENT,
]);

/** Branch-scoped roles: branchId bo'lishi shart */
const BRANCH_ROLES = new Set<UserRole>([
  UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL,
  UserRole.TEACHER, UserRole.CLASS_TEACHER,
  UserRole.ACCOUNTANT, UserRole.LIBRARIAN,
  UserRole.STUDENT, UserRole.PARENT,
]);

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const anyAuthenticated = this.reflector.getAllAndOverride<boolean>(ANY_AUTHENTICATED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (anyAuthenticated) return true;

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();

    if (!user) return false;

    const hasRole = requiredRoles.includes(user.role as UserRole);

    // super_admin is NO LONGER blanket-bypassed.
    // super_admin may only access endpoints where SUPER_ADMIN is explicitly listed in @Roles().
    // This prevents super_admin from accessing school-scoped endpoints and seeing all schools' data.
    // Super admin endpoints (e.g. /api/super-admin/*) use @Roles(UserRole.SUPER_ADMIN) explicitly.
    if (!hasRole) {
      throw new ForbiddenException(
        "Bu amalni bajarish uchun sizda yetarli huquq yo'q",
      );
    }

    // branch_admin va boshqa branch-scoped rollar uchun branchId majburiy
    if (BRANCH_ROLES.has(user.role as UserRole) && !user.branchId) {
      // Xato tashlamaymiz (backward-compatible) — service layer schoolId bilan ishlaydi,
      // lekin kuzatuv uchun log qoldiramiz.
      const req = context.switchToHttp().getRequest<{ method?: string; url?: string }>();
      this.logger.warn(
        `branchId yo'q foydalanuvchi branch-scoped endpointga murojaat qildi: userId=${user.sub} role=${user.role} ${req?.method ?? ''} ${req?.url ?? ''}`,
      );
    }

    return true;
  }
}
