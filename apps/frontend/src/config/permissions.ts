/**
 * ROLE PERMISSIONS — Single Source of Truth
 * Har bir route va sidebar elementi uchun ruxsat etilgan rollar.
 * Middleware, Sidebar, RoleGuard, va MobileNav barcha shu fayldan foydalanadi.
 *
 * QAT'IY QOIDA:
 *   super_admin = faqat platforma darajasidagi admin (maktablar, subscription, system-health).
 *   super_admin hech qachon maktab ichidagi operatsion bo'limlarni (o'quvchilar, sinflar,
 *   moliya, dars jadvali, ...) ko'rmaydi va sidebar'da ko'rinmaydi.
 */

export type UserRole =
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

/** Rol nomlari — UI tanlash va ko'rsatish uchun */
export const ROLES: { value: UserRole; label: string }[] = [
  { value: 'director', label: 'Maktab direktori' },
  { value: 'vice_principal', label: "Mudir o'rinbosari" },
  { value: 'branch_admin', label: 'Filial boshqaruvchisi' },
  { value: 'teacher', label: "O'qituvchi" },
  { value: 'class_teacher', label: 'Sinf rahbari' },
  { value: 'accountant', label: 'Moliyachi' },
  { value: 'librarian', label: 'Kutubxonachi' },
  { value: 'student', label: "O'quvchi" },
  { value: 'parent', label: 'Ota-ona' },
];

/** Har bir route uchun ruxsat etilgan rollar */
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // SUPER_ADMIN — faqat platforma darajasida
  // ═══════════════════════════════════════════════════════════════════════════════
  '/dashboard/schools':        ['super_admin'],
  '/dashboard/schools/new':    ['super_admin'],
  '/dashboard/system-health':  ['super_admin'],
  // ═══════════════════════════════════════════════════════════════════════════════
  // ONBOARDING
  // ═══════════════════════════════════════════════════════════════════════════════
  '/dashboard/onboarding':     ['director', 'vice_principal'],
  '/dashboard/setup':          ['director', 'vice_principal', 'branch_admin'],
  '/dashboard/ops':            ['director', 'vice_principal', 'branch_admin', 'accountant'],

  // ═══════════════════════════════════════════════════════════════════════════════
  // DIRECTOR — Maktab boshqaruvi (bird's eye view, CRUD faqat strategic narsalarda)
  // ═══════════════════════════════════════════════════════════════════════════════
  '/dashboard/audit-log':      ['super_admin', 'director'],
  '/dashboard/users':          ['director', 'vice_principal', 'branch_admin'],
  '/dashboard/staff':          ['director', 'vice_principal', 'branch_admin'],
  '/dashboard/branches':       ['director', 'vice_principal'],
  '/dashboard/crm':            ['director', 'vice_principal', 'branch_admin'],
  '/dashboard/meetings':       ['director', 'vice_principal', 'class_teacher'],
  '/dashboard/leave-requests': ['director', 'vice_principal', 'branch_admin'],
  '/dashboard/teacher-substitutions': ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher'],
  '/dashboard/approvals':      ['director', 'vice_principal'],
  '/dashboard/alerts':         ['director', 'vice_principal', 'branch_admin'],

  // ═══════════════════════════════════════════════════════════════════════════════
  // DISCIPLINE
  // ═══════════════════════════════════════════════════════════════════════════════
  '/dashboard/discipline':     ['director', 'vice_principal', 'class_teacher', 'branch_admin'],

  // ═══════════════════════════════════════════════════════════════════════════════
  // FINANCE
  // ═══════════════════════════════════════════════════════════════════════════════
  '/dashboard/finance':        ['director', 'accountant', 'branch_admin'],
  '/dashboard/payments':       ['director', 'accountant', 'branch_admin'],
  '/dashboard/payroll':        ['director', 'accountant'],
  '/dashboard/fee-structures': ['director', 'accountant', 'branch_admin'],

  // ═══════════════════════════════════════════════════════════════════════════════
  // REPORTS
  // ═══════════════════════════════════════════════════════════════════════════════
  '/dashboard/reports':        ['director', 'vice_principal', 'accountant', 'teacher', 'class_teacher'],

  // ═══════════════════════════════════════════════════════════════════════════════
  // EDUCATION — Ta'lim bo'limi
  // ═══════════════════════════════════════════════════════════════════════════════
  '/dashboard/education':      ['director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'],
  '/dashboard/students':       ['director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'],
  '/dashboard/classes':        ['director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'],
  '/dashboard/subjects':       ['director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'],
  '/dashboard/academic-calendar': ['director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'],

  // ═══════════════════════════════════════════════════════════════════════════════
  // SHARED ACADEMIC — Ko'rish uchun student/parent, boshqarish uchun staff
  // ═══════════════════════════════════════════════════════════════════════════════
  '/dashboard/schedule':       ['student', 'teacher', 'class_teacher', 'vice_principal', 'director', 'branch_admin', 'parent'],
  '/dashboard/grades':         ['student', 'teacher', 'class_teacher', 'vice_principal', 'director', 'branch_admin', 'parent'],
  '/dashboard/exams':          ['student', 'teacher', 'class_teacher', 'vice_principal', 'director', 'branch_admin', 'parent'],
  '/dashboard/homework':       ['student', 'teacher', 'class_teacher', 'vice_principal', 'director', 'branch_admin', 'parent'],
  '/dashboard/attendance':     ['student', 'teacher', 'class_teacher', 'vice_principal', 'director', 'branch_admin', 'parent'],
  '/dashboard/attendance/bulk': ['director', 'vice_principal', 'class_teacher'],
  '/dashboard/my-class':       ['class_teacher'],

  // ═══════════════════════════════════════════════════════════════════════════════
  // RESOURCES
  // ═══════════════════════════════════════════════════════════════════════════════
  '/dashboard/resources':      ['director', 'vice_principal', 'teacher', 'class_teacher', 'librarian', 'branch_admin', 'student'],
  '/dashboard/library':        ['director', 'vice_principal', 'teacher', 'class_teacher', 'librarian', 'branch_admin'],
  '/dashboard/learning-center': ['director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin', 'student'],
  '/dashboard/clubs':          ['director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin', 'student'],
  '/dashboard/coins':          ['director', 'vice_principal', 'student', 'parent'],
  '/dashboard/canteen':        ['director', 'vice_principal', 'branch_admin'],
  '/dashboard/transport':      ['director', 'vice_principal', 'branch_admin'],

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMMUNICATION
  // ═══════════════════════════════════════════════════════════════════════════════
  '/dashboard/comms':          ['director', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian', 'branch_admin', 'student', 'parent'],
  '/dashboard/messages':       ['director', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian', 'branch_admin', 'student', 'parent'],
  '/dashboard/notifications':  ['director', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian', 'branch_admin', 'student', 'parent'],
  '/dashboard/announcements':  ['director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'],

  // ═══════════════════════════════════════════════════════════════════════════════
  // PORTALS
  // ═══════════════════════════════════════════════════════════════════════════════
  '/dashboard/student':        ['student'],
  '/dashboard/student/shop':   ['student'],
  '/dashboard/parent':         ['parent'],

  // ═══════════════════════════════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════════
  '/dashboard/settings':       ['super_admin', 'director', 'vice_principal'],
  '/dashboard/profile':        ['super_admin', 'director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher', 'accountant', 'librarian', 'student', 'parent'],
  '/dashboard/kpi':            ['director', 'vice_principal', 'branch_admin'],
  '/dashboard/kpi/metrics':    ['director', 'vice_principal', 'branch_admin'],
  '/dashboard/insights':       ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher'],
  '/dashboard/marketing':      ['director', 'vice_principal', 'branch_admin'],
  '/dashboard/analytics/timetable': ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher', 'accountant'],
  '/dashboard/teaching-loads':    ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher'],
  '/dashboard/reports/workload':  ['director', 'vice_principal', 'accountant', 'teacher', 'class_teacher'],
  '/dashboard':                   ['super_admin', 'director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher', 'accountant', 'librarian', 'student', 'parent'],
};

/** Sidebar nav elementlari uchun ruxsat etilgan rollar
 *  (agar kerak bo'lsa, lekin hozir sidebar to'g'ridan-to'g'ri ROUTE_PERMISSIONS dan foydalanadi)
 */
export const SIDEBAR_PERMISSIONS: Record<string, UserRole[]> = {
  'Dashboard':       undefined as any, // all roles
  'Maktablar':       ['super_admin'],
  'Foydalanuvchilar': ['director', 'vice_principal', 'branch_admin'],
  'Audit log':       ['super_admin'],
};

/** Role'ga mos bosh sahifa (fallback redirect uchun) */
export const ROLE_HOME: Record<UserRole, string> = {
  super_admin:   '/dashboard/schools',
  director:      '/dashboard',
  vice_principal:'/dashboard',
  branch_admin:  '/dashboard',
  teacher:       '/dashboard',
  class_teacher: '/dashboard',
  accountant:    '/dashboard/finance',
  librarian:     '/dashboard/library',
  student:       '/dashboard/student',
  parent:        '/dashboard/parent',
};

/** Middleware va RoleGuard uchun helper */
export function canAccessRoute(role: string, pathname: string): boolean {
  // Explicitly allow the dashboard root for all authenticated roles
  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return true;
  }

  for (const [route, roles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return roles.includes(role as UserRole);
    }
  }

  // UNKNOWN route — DENY by default (security first)
  // Developers must explicitly register new routes in ROUTE_PERMISSIONS.
  return false;
}
