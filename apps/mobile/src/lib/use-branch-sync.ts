/**
 * Branch sync hook — auth store bilan branch store'ni sinxronlaydi
 * (MOBILE_FOUNDATION_SPEC §4.3). auth.store.ts'ni o'zgartirmasdan, bu hook
 * orqali role/user o'zgarganda active branch yangilanadi.
 *
 * Qoidalar:
 *  - Director / super_admin → activeBranchId = null (barcha filiallar).
 *  - Boshqa rollar → activeBranchId = user.branchId.
 *
 * Ishlatish: root `_layout.tsx` ichida bir marta chaqriladi.
 *   useBranchSync();
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useBranchStore, resolveBranchId } from '@/store/branch.store';

export function useBranchSync() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setActiveBranch = useBranchStore((s) => s.setActiveBranch);
  const resetBranch = useBranchStore((s) => s.reset);
  const activeBranchId = useBranchStore((s) => s.activeBranchId);
  const prevBranchRef = useRef<string | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      resetBranch();
      return;
    }
    const branchId = resolveBranchId(user.role, user.branchId);
    setActiveBranch(branchId);
  }, [isAuthenticated, user, setActiveBranch, resetBranch]);

  useEffect(() => {
    if (prevBranchRef.current !== activeBranchId) {
      prevBranchRef.current = activeBranchId;
      qc.clear(); // invalidate all queries when tenant changes
    }
  }, [activeBranchId, qc]);
}
