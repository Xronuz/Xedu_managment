import { JwtPayload, UserRole } from '@eduplatform/types';

/**
 * buildTenantWhere(user)
 *
 * Universal tenant filter for Prisma `where` clauses.
 * - super_admin → no filters (platform-wide access)
 * - schoolId is always required for non-super-admin
 * - branchId is included only when present in JWT (directors may have null branchId → school-wide)
 * - Multi-branch staff: branchId = { in: [primary, ...assigned] }
 */
export function buildTenantWhere(user: JwtPayload): { schoolId?: string; branchId?: string | { in: string[] } } {
  if (user.isSuperAdmin || user.role === UserRole.SUPER_ADMIN) {
    return {}; // Super admin sees everything
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
