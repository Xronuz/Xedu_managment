'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { systemConfigApi } from '@/lib/api/system-config';

// Barqaror bo'sh massiv — har renderda yangi [] qaytarilsa, navGroups'ga
// bog'liq useEffect'lar cheksiz siklga tushadi (Maximum update depth)
const EMPTY: string[] = [];

/**
 * Joriy maktab uchun O'CHIRILGAN modullar ro'yxati.
 * Sidebar va boshqa navigatsiya komponentlari shu bo'yicha bo'limlarni yashiradi.
 * super_admin (schoolId yo'q) uchun har doim bo'sh ro'yxat.
 */
export function useDisabledModules(): string[] {
  const { user, isAuthenticated } = useAuthStore();
  const isSchoolUser = isAuthenticated && !!user?.schoolId && user.role !== 'super_admin';

  const { data } = useQuery({
    queryKey: ['disabled-modules', user?.schoolId],
    queryFn: () => systemConfigApi.getDisabledModules(),
    enabled: isSchoolUser,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  return data?.disabled ?? EMPTY;
}
