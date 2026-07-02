/**
 * Role → Home component dispatch (MOBILE_FOUNDATION_SPEC §1.1, F3).
 *
 * `(app)/index.tsx` endi if/else zanjiri emas, shu Map'dan render qiladi.
 * Yangi role qo'shilganda: shu yerga komponent qo'shamiz + `tabs.ts` va
 * `permissions.ts` ni yangilaymiz.
 *
 * Week 5: barcha 8 role home'ga ega. super_admin hali ComingSoon (platforma
 * admini — maktablar ro'yxati Phase 2'da to'liq quriladi).
 */
import type { ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StudentHome } from '../student-home';
import { TeacherHome } from '../teacher-home';
import { DirectorHome } from '../director-home';
import { ParentHome } from './parent-home';
import { VicePrincipalHome } from './vice-principal-home';
import { BranchAdminHome } from './branch-admin-home';
import { AccountantHome } from './accountant-home';
import { LibrarianHome } from './librarian-home';
import { ComingSoonHome } from './coming-soon-home';
import { studentApi } from '@/api/student';
import type { AppRole } from '@/config/permissions';

export interface HomeProps {
  name: string;
  avatarUrl?: string | null;
}

/**
 * StudentHome coins prop'ini qabul qiladi. Coins query'sini shu yerda
 * (adapter ichida) bajaramiz — shu sabab StudentHome komponenti o'zgartirilmaydi
 * ("existing componentlarni buzma" qoidasi) va boshqa home'lar bilan bir xil
 * props imzosi saqlanadi.
 */
function StudentHomeAdapter(props: HomeProps) {
  const coinsQuery = useQuery<{ coins: number }>({
    queryKey: ['student', 'coins', 'balance'],
    queryFn: studentApi.coinsBalance,
    retry: false,
  });
  return <StudentHome {...props} coins={coinsQuery.data?.coins ?? 0} />;
}

/** Role → Home component (props imzosi bir xil). */
export const HOME_REGISTRY: Partial<Record<AppRole, ComponentType<HomeProps>>> = {
  student: StudentHomeAdapter,
  teacher: TeacherHome,
  class_teacher: TeacherHome,
  director: DirectorHome,
  parent: ParentHome,
  vice_principal: VicePrincipalHome,
  branch_admin: BranchAdminHome,
  accountant: AccountantHome,
  librarian: LibrarianHome,
  // super_admin — platforma darajasi; maktablar ro'yxati Phase 2'da.
  super_admin: ComingSoonHome,
};

/** Berilgan role uchun home componentni qaytaradi (undefined → fallback). */
export function homeForRole(role: string): ComponentType<HomeProps> {
  const r = (role || '').toLowerCase().trim() as AppRole;
  return HOME_REGISTRY[r] ?? ComingSoonHome;
}
