import { useAuthStore } from '@/store/auth.store';

/**
 * useTenantQueryKey
 *
 * Returns a function that prepends tenant context to any query key.
 * This ensures cache isolation across schools and branches.
 *
 * Usage:
 *   const tq = useTenantQueryKey();
 *   const queryKey = tq(['classes', search, filterGrade]);
 *   // Result: ['classes', search, filterGrade, { s: 'school-uuid', b: 'branch-uuid' }]
 */
export function useTenantQueryKey() {
  const { user, activeBranchId } = useAuthStore();
  const schoolId = user?.schoolId ?? null;

  return (key: unknown[]): unknown[] => {
    const meta = { s: schoolId, b: activeBranchId };
    return [...key, meta];
  };
}

/**
 * makeTenantQueryKey
 *
 * Static version for use outside React hooks (e.g., in mutation callbacks).
 */
export function makeTenantQueryKey(
  key: unknown[],
  schoolId: string | null,
  branchId: string | null,
): unknown[] {
  return [...key, { s: schoolId, b: branchId }];
}
