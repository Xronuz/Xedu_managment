'use client';

/**
 * BranchSwitcher — director / branch_admin uchun
 * aktiv filialni tanlash dropdown komponenti.
 *
 * - Filialar ro'yxatini /branches dan yuklab useBranchStore.setBranches() ga saqlaydi.
 * - Tanlash: useSwitchBranch() → POST /auth/switch-branch → yangi JWT → cache clear.
 * - Faqat tegishli rollar uchun render qilinadi (boshqalarda null qaytaradi).
 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, ChevronDown, Layers, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useBranchStore } from '@/store/branch.store';
import { useSwitchBranch } from '@/hooks/use-switch-branch';
import { branchesApi } from '@/lib/api/branches';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

/** Bu rollar uchun filial switcher ko'rsatiladi */
const SWITCHER_ROLES = new Set([
  'director', 'branch_admin',
  'vice_principal',
  'teacher', 'class_teacher',
  'accountant', 'librarian',
]);

export function BranchSwitcher() {
  const user = useAuthStore((s) => s.user);
  const authBranchId = useAuthStore((s) => s.activeBranchId);
  const { activeBranchMeta, branches, setBranches } = useBranchStore();
  const { switchBranch, isSwitching } = useSwitchBranch();

  // Source of truth: auth.store (apiClient reads from here)
  const activeBranchId = authBranchId;

  // Faqat tegishli rollar uchun render
  if (!user || !SWITCHER_ROLES.has(user.role)) return null;

  // Filiallar ro'yxatini yuklash
  const { data: fetchedBranches, isLoading } = useQuery({
    queryKey: ['branches', user.schoolId],
    queryFn: () => branchesApi.getAll(),
    staleTime: 5 * 60 * 1000, // 5 daqiqa cache
    enabled: !!user.schoolId,
  });

  // Yuklangan filiallarni store ga saqlash
  useEffect(() => {
    if (fetchedBranches) {
      setBranches(
        fetchedBranches.map((b) => ({
          id: b.id,
          name: b.name,
          code: b.code,
          address: b.address,
          isActive: b.isActive,
        })),
      );
    }
  }, [fetchedBranches, setBranches]);

  const isDirector = user?.role === 'director';
  const canSeeAllBranches = isDirector || user?.role === 'super_admin';

  // Hozirgi filial nomi
  const currentLabel = activeBranchId
    ? (activeBranchMeta?.name ?? branches.find((b) => b.id === activeBranchId)?.name ?? 'Filial')
    : canSeeAllBranches
      ? 'Barcha filiallar'
      : 'Filial tanlanmagan';

  // Staff rollari uchun faqat biriktirilgan filiallar
  const assignedBranchIds = user?.assignedBranchIds ?? [];
  const allEligibleBranchIds = [
    user?.branchId,
    ...assignedBranchIds,
  ].filter(Boolean) as string[];

  const activeBranches = branches.filter((b) => {
    if (!b.isActive) return false;
    if (canSeeAllBranches) return true;
    return allEligibleBranchIds.includes(b.id);
  });

  // branch_admin uchun: faqat bitta filiali bo'lsa — dropdown emas, oddiy badge
  const isBranchAdmin = user.role === 'branch_admin';
  if (isBranchAdmin && activeBranches.length <= 1) {
    return (
      <div className="hidden md:flex items-center gap-2 h-10 px-4 rounded-full bg-xedu-bg-elevated shadow-pill text-sm font-medium text-xedu-slate-700 dark:text-xedu-slate-200">
        <Building2 className="h-3.5 w-3.5 shrink-0" />
        <span className="max-w-[140px] truncate">
          {activeBranchMeta?.name ?? currentLabel}
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isSwitching || isLoading}
          className={cn(
            // Header pill — executive emerald material accent
            'hidden md:flex items-center gap-2 h-10 px-4 max-w-[220px]',
            'rounded-xl xedu-emerald-material',
            'text-sm font-medium text-xedu-slate-700 dark:text-xedu-slate-200',
            'xedu-tactile-hover',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-xedu-primary/30',
            authBranchId
              ? 'text-xedu-slate-700 dark:text-xedu-slate-200'
              : isDirector
                ? 'text-xedu-primary dark:text-xedu-primary'
                : '',
          )}
        >
          {isSwitching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          ) : !activeBranchId && isDirector ? (
            <Layers className="h-3.5 w-3.5 shrink-0 text-xedu-primary" />
          ) : (
            <Building2 className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="truncate">{currentLabel}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 font-normal">
          Aktiv filial tanlang
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* "Barcha filiallar" — faqat director */}
        {isDirector && (
          <>
            <DropdownMenuItem
              onClick={() => switchBranch(null, null)}
              className="flex items-center gap-2"
            >
              <Layers className="h-4 w-4 text-xedu-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Barcha filiallar</p>
                <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Umumiy statistika</p>
              </div>
              {!activeBranchId && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Filiallar ro'yxati */}
        {isLoading ? (
          <DropdownMenuItem disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Yuklanmoqda...
          </DropdownMenuItem>
        ) : activeBranches.length === 0 ? (
          <DropdownMenuItem disabled>
            <span className="text-xedu-slate-500 dark:text-xedu-slate-400 text-sm">Filiallar topilmadi</span>
          </DropdownMenuItem>
        ) : (
          activeBranches.map((branch) => (
            <DropdownMenuItem
              key={branch.id}
              onClick={() =>
                switchBranch(branch.id, {
                  id: branch.id,
                  name: branch.name,
                  code: branch.code,
                  address: branch.address,
                  isActive: branch.isActive,
                })
              }
              className="flex items-center gap-2"
            >
              <Building2 className="h-4 w-4 text-xedu-slate-500 dark:text-xedu-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{branch.name}</p>
                {branch.code && (
                  <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">{branch.code}</p>
                )}
              </div>
              {activeBranchId === branch.id && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </DropdownMenuItem>
          ))
        )}

        {/* Filialni boshqarish — faqat director */}
        {user.role === 'director' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => window.location.assign('/dashboard/branches')}
              className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400"
            >
              <Badge variant="outline" className="text-xs mr-2">+</Badge>
              Filiallarni boshqarish
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
