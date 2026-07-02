/**
 * Mobile ROLE PERMISSIONS — web `apps/frontend/src/config/permissions.ts`
 * dan port qilingan (single source of truth). MenuHub va screen-level
 * RoleGuard shu yerdan o'qiydi.
 *
 * Qoida (MOBILE_FOUNDATION_SPEC §4.4):
 *   super_admin = faqat platforma darajasidagi admin (maktablar, system-health).
 *   super_admin hech qachon maktab ichidagi operatsion bo'limlarni ko'rmaydi.
 *
 * Mobile route'lar web'nikidan farq qiladi (`/dashboard/...` → `/more/...` yoki
 * tab nomi). Shuning uchun mobile'ga mos mobile'lar (mobile-specific) route
 * mapping saqlaymiz. Agar yangi mobile route qo'shilsa, shu yerga ro'yxatdan
 * o'tkazish shart.
 */

export type AppRole =
  | 'super_admin'
  | 'director'
  | 'vice_principal'
  | 'branch_admin'
  | 'teacher'
  | 'class_teacher'
  | 'accountant'
  | 'librarian'
  | 'student'
  | 'parent';

export const ALL_ROLES: AppRole[] = [
  'super_admin',
  'director',
  'vice_principal',
  'branch_admin',
  'teacher',
  'class_teacher',
  'accountant',
  'librarian',
  'student',
  'parent',
];

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Platforma admini',
  director: 'Maktab direktori',
  vice_principal: "Mudir o'rinbosari",
  branch_admin: 'Filial boshqaruvchisi',
  teacher: "O'qituvchi",
  class_teacher: 'Sinf rahbari',
  accountant: 'Moliyachi',
  librarian: 'Kutubxonachi',
  student: "O'quvchi",
  parent: 'Ota-ona',
};

/**
 * Mobile route → ruxsat etilgan rollar.
 * mobile route nomlari: `/more/...`, `/child/[id]`, tab nomlari (`schedule`,
 * `homework`, ...) yoki mutlaq yo'llar (`/messages`).
 */
export const MOBILE_ROUTE_PERMISSIONS: Record<string, AppRole[]> = {
  // Tabs / shared
  '/':                  ['super_admin', 'director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher', 'accountant', 'librarian', 'student', 'parent'],
  '/messages':          ['super_admin', 'director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher', 'accountant', 'librarian', 'student', 'parent'],
  '/notifications':     ['super_admin', 'director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher', 'accountant', 'librarian', 'student', 'parent'],
  '/menu':              ['super_admin', 'director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher', 'accountant', 'librarian', 'student', 'parent'],

  // Student tabs
  '/schedule':          ['student', 'teacher', 'class_teacher', 'vice_principal', 'director', 'branch_admin', 'parent'],
  '/grades':            ['student', 'teacher', 'class_teacher', 'vice_principal', 'director', 'branch_admin', 'parent'],
  '/homework':          ['student', 'teacher', 'class_teacher', 'vice_principal', 'director', 'branch_admin', 'parent'],

  // Teacher tabs
  '/today':             ['teacher', 'class_teacher'],
  '/classes':           ['teacher', 'class_teacher', 'director', 'vice_principal', 'branch_admin'],

  // Parent tabs
  '/children':          ['parent'],
  '/child/[id]':        ['parent'],

  // More/* (MenuHub deep-links) — staff/finance/management
  '/more/payments':     ['director', 'accountant', 'branch_admin'],
  '/more/finance':      ['director', 'accountant', 'branch_admin'],
  '/more/payroll':      ['director', 'accountant'],
  '/more/fee-structures': ['director', 'accountant', 'branch_admin'],
  '/more/students':     ['director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'],
  '/more/staff':        ['director', 'vice_principal', 'branch_admin'],
  '/more/users':        ['director', 'vice_principal', 'branch_admin'],
  '/more/classes':      ['director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'],
  '/more/approvals':    ['director', 'vice_principal'],
  '/more/alerts':       ['director', 'vice_principal', 'branch_admin'],
  '/more/ops':          ['director', 'vice_principal', 'branch_admin', 'accountant'],
  '/more/library':      ['director', 'vice_principal', 'teacher', 'class_teacher', 'librarian', 'branch_admin'],
  '/more/loans':        ['director', 'librarian'],
  '/more/settings':     ['super_admin', 'director', 'vice_principal', 'branch_admin'],
  '/more/schools':      ['super_admin'],
  '/more/system-health': ['super_admin'],
  '/more/demo-requests': ['super_admin'],
  '/more/broadcast':    ['super_admin', 'director', 'vice_principal', 'branch_admin'],
  '/more/announcements': ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher', 'student', 'parent', 'accountant', 'librarian'],
};

/** Middleware / RoleGuard uchun helper. */
export function canAccessRoute(role: string, pathname: string): boolean {
  const r = (role || '').toLowerCase().trim();

  // Root — barcha authenticated userlar uchun.
  if (pathname === '/' || pathname === '') return true;

  for (const [route, roles] of Object.entries(MOBILE_ROUTE_PERMISSIONS)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return roles.includes(r as AppRole);
    }
  }

  // Noma'lum route — default DENY (security first).
  return false;
}
