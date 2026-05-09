import { JwtPayload, UserRole } from '@eduplatform/types';

/**
 * buildTenantWhere(user, explicitSchoolId?)
 *
 * Universal tenant filter for Prisma `where` clauses.
 * - super_admin → MUST provide explicitSchoolId, otherwise returns filter that matches nothing
 * - schoolId is always required for non-super-admin
 * - branchId is included only when present in JWT (directors may have null branchId → school-wide)
 * - Multi-branch staff: branchId = { in: [primary, ...assigned] }
 *
 * CRITICAL: super_admin no longer gets unfiltered platform-wide access via school-scoped endpoints.
 * Super admin must use dedicated /super-admin endpoints or provide explicitSchoolId.
 */
export function buildTenantWhere(user: JwtPayload, explicitSchoolId?: string): { schoolId: string; branchId?: string | { in: string[] } } {
  if (user.isSuperAdmin || user.role === UserRole.SUPER_ADMIN) {
    if (explicitSchoolId) {
      return { schoolId: explicitSchoolId };
    }
    // Return a filter that matches nothing — forces explicit scoping
    return { schoolId: '__SUPER_ADMIN_REQUIRES_EXPLICIT_SCHOOL_ID__' };
  }

  const where: { schoolId: string; branchId?: string | { in: string[] } } = { schoolId: user.schoolId! };

  if (user.branchId) {
    const allBranches = [user.branchId, ...(user.assignedBranchIds ?? [])];
    if (allBranches.length === 1) {
      where.branchId = allBranches[0];
    } else {
      where.branchId = { in: allBranches };
    }
  }
  return where;
}
