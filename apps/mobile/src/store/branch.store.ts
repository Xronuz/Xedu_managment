/**
 * Branch Store (mobile) — Phase 1 minimal filial konteksti.
 *
 * Web (`apps/frontend/src/store/branch.store.ts`) to'liq switcher bilan ishlaydi,
 * lekin Phase 1 mobile'da switcher yo'q — JWT'dagi `branchId` ishlatiladi.
 * Bu store faqat aktiv filialni bitta joydan o'qish uchun yagona manba.
 *
 * Qoidalar (MOBILE_FOUNDATION_SPEC §4.3):
 *  - Director / super_admin → `activeBranchId = null` (barcha filiallar).
 *  - Boshqa rollar → `activeBranchId = user.branchId` (JWT'dan).
 *  - Phase 2'da switcher qo'shiladi; shu store'ni kengaytirib qo'yamiz.
 *
 * foydalanish:
 *   const branchId = useBranchStore(s => s.activeBranchId);
 *   // API chaqiruvda: params: branchId ? { branchId } : {}
 */
import { create } from 'zustand';

export interface BranchMeta {
  id: string;
  name: string;
  code?: string | null;
  address?: string | null;
  isActive: boolean;
}

interface BranchState {
  /** Aktiv filial id (null = barchasi / school-wide). */
  activeBranchId: string | null;
  /** Aktiv filial UI meta-ma'lumoti (nom ko'rsatish uchun). */
  activeBranchMeta: BranchMeta | null;
  /** Maktabdagi barcha filiallar (switcher uchun, Phase 2). */
  branches: BranchMeta[];
  /** Filial almashtirilmoqda (Phase 2). */
  isSwitching: boolean;

  /** Aktiv filialni o'rnatish (login yoki switch vaqtida). */
  setActiveBranch: (branchId: string | null, meta?: BranchMeta | null) => void;
  /** Maktab filiallari ro'yxatini yangilash (Phase 2 switcher uchun). */
  setBranches: (branches: BranchMeta[]) => void;
  /** Switching loader (Phase 2). */
  setIsSwitching: (value: boolean) => void;
  /** Logout / school o'zgarishda reset. */
  reset: () => void;
}

const initialState = {
  activeBranchId: null,
  activeBranchMeta: null,
  branches: [],
  isSwitching: false,
};

export const useBranchStore = create<BranchState>((set, get) => ({
  ...initialState,

  setActiveBranch: (branchId, meta = null) => {
    const found = meta ?? (branchId
      ? get().branches.find((b) => b.id === branchId) ?? null
      : null);
    set({ activeBranchId: branchId, activeBranchMeta: found });
  },

  setBranches: (branches) => set({ branches }),

  setIsSwitching: (value) => set({ isSwitching: value }),

  reset: () => set(initialState),
}));

/**
 * Aktiv filialni role asosida hisoblash (helper).
 * Director / super_admin → null. Boshqalar → user.branchId.
 */
export function resolveBranchId(role: string, userBranchId: string | null): string | null {
  const r = (role || '').toLowerCase().trim();
  if (r === 'director' || r === 'super_admin') return null;
  return userBranchId ?? null;
}
