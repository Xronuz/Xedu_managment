import type { Ionicons } from '@expo/vector-icons';

export type MenuGroup = 'academic' | 'people' | 'finance' | 'analytics' | 'management' | 'system' | 'student_learning' | 'student_growth' | 'student_resources';

export interface MenuItem {
  key: string;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  group: MenuGroup;
  roles: string[];
  route?: string;
  built?: boolean;
}

const ALL_STUDENT = ['student'];
const MGMT = ['director', 'vice_principal', 'branch_admin'];
const MGMT_PLUS = ['director', 'vice_principal', 'branch_admin', 'super_admin'];
const TEACHERS = ['teacher', 'class_teacher'];
const ACADEMIC_VIEWERS = ['student', 'teacher', 'class_teacher', 'vice_principal', 'director', 'branch_admin', 'parent'];

export const MENU: MenuItem[] = [
  // ── O'quv jarayoni ──────────────────────────────────────────────────────────
  { key: 'announcements', labelKey: 'more.announcements', icon: 'megaphone-outline', group: 'academic', roles: ['director','vice_principal','branch_admin','teacher','class_teacher','student','parent','accountant','librarian'], route: '/more/announcements', built: true },
  { key: 'calendar', labelKey: 'more.calendar', icon: 'calendar-outline', group: 'academic', roles: ['director','vice_principal','branch_admin','teacher','class_teacher','student','parent','accountant'], route: '/more/calendar', built: false },
  { key: 'exams', labelKey: 'more.exams', icon: 'clipboard-outline', group: 'academic', roles: ACADEMIC_VIEWERS, route: '/more/exams', built: false },
  { key: 'homework', labelKey: 'menu.homework', icon: 'book-outline', group: 'academic', roles: [...MGMT, ...TEACHERS, 'parent'], route: '/more/homework', built: true },
  { key: 'clubs', labelKey: 'more.clubs', icon: 'people-circle-outline', group: 'academic', roles: [...MGMT, ...TEACHERS, 'student'], route: '/more/clubs', built: false },
  { key: 'courses', labelKey: 'more.courses', icon: 'school-outline', group: 'academic', roles: [...MGMT, ...TEACHERS, 'student'], route: '/more/courses', built: false },
  { key: 'portfolio', labelKey: 'more.portfolio', icon: 'ribbon-outline', group: 'academic', roles: ['student'], route: '/more/portfolio', built: false },
  { key: 'library', labelKey: 'more.library', icon: 'library-outline', group: 'academic', roles: [...MGMT, ...TEACHERS, 'librarian', 'student'], route: '/more/library', built: false },
  { key: 'transport', labelKey: 'more.transport', icon: 'bus-outline', group: 'academic', roles: ['student', 'parent', ...MGMT], route: '/more/transport', built: false },
  { key: 'discipline', labelKey: 'menu.discipline', icon: 'shield-outline', group: 'academic', roles: MGMT, route: '/more/discipline', built: false },
  { key: 'resources', labelKey: 'menu.resources', icon: 'folder-outline', group: 'academic', roles: [...MGMT, ...TEACHERS, 'librarian', 'student'], built: false },
  { key: 'education', labelKey: 'menu.education', icon: 'book-outline', group: 'academic', roles: [...MGMT, ...TEACHERS], built: false },

  // ── Sinf & fan (boshqaruv/o'qituvchi) ───────────────────────────────────────
  { key: 'students', labelKey: 'menu.students', icon: 'people-outline', group: 'people', roles: [...MGMT, ...TEACHERS], route: '/more/students', built: true },
  { key: 'classes', labelKey: 'menu.classes', icon: 'easel-outline', group: 'people', roles: [...MGMT, ...TEACHERS], route: '/more/classes', built: true },
  { key: 'subjects', labelKey: 'menu.subjects', icon: 'bookmarks-outline', group: 'people', roles: [...MGMT, ...TEACHERS], route: '/more/subjects', built: false },
  { key: 'teachingLoads', labelKey: 'menu.teachingLoads', icon: 'briefcase-outline', group: 'people', roles: [...MGMT, ...TEACHERS], route: '/more/teaching-loads', built: false },
  { key: 'substitutions', labelKey: 'menu.substitutions', icon: 'swap-horizontal-outline', group: 'people', roles: [...MGMT, ...TEACHERS], route: '/more/substitutions', built: false },
  { key: 'staff', labelKey: 'menu.staff', icon: 'id-card-outline', group: 'people', roles: MGMT, route: '/more/staff', built: true },
  { key: 'users', labelKey: 'menu.users', icon: 'person-circle-outline', group: 'people', roles: MGMT, route: '/more/users', built: false },
  { key: 'branches', labelKey: 'menu.branches', icon: 'git-branch-outline', group: 'people', roles: ['director', 'vice_principal'], built: false },

  // ── Moliya ──────────────────────────────────────────────────────────────────
  { key: 'finance', labelKey: 'more.finance', icon: 'pie-chart-outline', group: 'finance', roles: ['director', 'accountant', 'branch_admin'], route: '/more/finance', built: false },
  { key: 'payments', labelKey: 'menu.payments', icon: 'card-outline', group: 'finance', roles: ['director', 'accountant', 'branch_admin'], route: '/more/payments', built: true },
  { key: 'feeStructures', labelKey: 'menu.feeStructures', icon: 'pricetags-outline', group: 'finance', roles: ['director', 'accountant', 'branch_admin'], route: '/more/fee-structures', built: false },
  { key: 'payroll', labelKey: 'menu.payroll', icon: 'wallet-outline', group: 'finance', roles: ['director', 'accountant'], route: '/more/payroll', built: false },
  { key: 'crm', labelKey: 'menu.crm', icon: 'magnet-outline', group: 'finance', roles: ['director', 'vice_principal', 'branch_admin', 'accountant'], route: '/more/crm', built: false },

  // ── Analitika / Hisobot ─────────────────────────────────────────────────────
  { key: 'kpi', labelKey: 'more.kpi', icon: 'trophy-outline', group: 'analytics', roles: TEACHERS, route: '/more/kpi', built: false },
  { key: 'kpiAdmin', labelKey: 'menu.kpiAdmin', icon: 'speedometer-outline', group: 'analytics', roles: MGMT_PLUS, route: '/more/kpi-admin', built: false },
  { key: 'insights', labelKey: 'menu.insights', icon: 'bulb-outline', group: 'analytics', roles: [...MGMT, 'accountant'], route: '/more/insights', built: false },
  { key: 'reports', labelKey: 'menu.reports', icon: 'bar-chart-outline', group: 'analytics', roles: [...MGMT, ...TEACHERS, 'accountant'], built: false },
  { key: 'ops', labelKey: 'menu.ops', icon: 'pulse-outline', group: 'analytics', roles: ['director', 'vice_principal', 'branch_admin', 'accountant'], route: '/more/ops', built: false },
  { key: 'alerts', labelKey: 'menu.alerts', icon: 'warning-outline', group: 'analytics', roles: [...MGMT, 'accountant'], route: '/more/alerts', built: true },
  { key: 'timetableAnalytics', labelKey: 'menu.timetableAnalytics', icon: 'analytics-outline', group: 'analytics', roles: [...MGMT, ...TEACHERS, 'accountant'], built: false },
  { key: 'exportCenter', labelKey: 'menu.exportCenter', icon: 'download-outline', group: 'analytics', roles: [...MGMT, ...TEACHERS, 'accountant'], built: false },
  { key: 'marketing', labelKey: 'menu.marketing', icon: 'trending-up-outline', group: 'analytics', roles: MGMT, built: false },

  // ── Boshqaruv ───────────────────────────────────────────────────────────────
  { key: 'approvals', labelKey: 'more.approvals', icon: 'checkmark-done-outline', group: 'management', roles: ['director', 'vice_principal'], route: '/more/approvals', built: true },
  { key: 'leaveSelf', labelKey: 'more.myLeave', icon: 'airplane-outline', group: 'management', roles: TEACHERS, route: '/more/leave', built: false },
  { key: 'meetings', labelKey: 'more.meetings', icon: 'people-outline', group: 'management', roles: ['director', 'vice_principal', 'class_teacher', 'parent'], route: '/more/meetings', built: false },
  { key: 'loans', labelKey: 'more.loans', icon: 'book-outline', group: 'management', roles: ['director', 'librarian'], route: '/more/loans', built: false },
  { key: 'canteen', labelKey: 'menu.canteen', icon: 'restaurant-outline', group: 'management', roles: [...MGMT, ...TEACHERS, 'student', 'parent'], route: '/more/canteen', built: false },
  { key: 'shop', labelKey: 'menu.shop', icon: 'bag-handle-outline', group: 'management', roles: ['student'], route: '/more/shop', built: false },
  { key: 'shopAdmin', labelKey: 'menu.shopAdmin', icon: 'pricetag-outline', group: 'management', roles: MGMT, route: '/more/shop-admin', built: false },
  { key: 'broadcast', labelKey: 'menu.broadcast', icon: 'radio-outline', group: 'management', roles: ['super_admin', ...MGMT], route: '/more/broadcast', built: false },
  { key: 'settings', labelKey: 'menu.settings', icon: 'settings-outline', group: 'management', roles: ['super_admin', 'director', 'vice_principal', 'branch_admin'], route: '/more/settings', built: true },

  // ── Tizim (super admin) ─────────────────────────────────────────────────────
  { key: 'schools', labelKey: 'menu.schools', icon: 'business-outline', group: 'system', roles: ['super_admin'], route: '/more/schools', built: false },
  { key: 'demoRequests', labelKey: 'menu.demoRequests', icon: 'mail-unread-outline', group: 'system', roles: ['super_admin'], route: '/more/demo-requests', built: false },
  { key: 'audit', labelKey: 'menu.audit', icon: 'document-lock-outline', group: 'system', roles: ['super_admin', 'director'], built: false },
  { key: 'systemHealth', labelKey: 'menu.systemHealth', icon: 'heart-circle-outline', group: 'system', roles: ['super_admin'], route: '/more/system-health', built: false },
];

export const MENU_GROUPS: MenuGroup[] = [
  'student_learning', 'student_growth', 'student_resources', // Student groups
  'academic', 'people', 'finance', 'analytics', 'management', 'system' // Traditional groups
];

const DIRECTOR_MENU_KEYS = new Set([
  'announcements', 'alerts', 'approvals', 'staff', 'settings',
]);

export function menuForRole(role: string): MenuItem[] {
  const r = (role || '').toLowerCase().trim();
  
  if (r === 'student') {
    // Student uchun maxsus, task-oriented menu (maksimum 3 ta built:false)
    return [
      // My Learning / O'qishim
      { key: 'schedule', labelKey: 'menu.schedule', icon: 'calendar-outline', group: 'student_learning', roles: ['student'], route: '/schedule', built: true },
      { key: 'homework', labelKey: 'menu.homework', icon: 'book-outline', group: 'student_learning', roles: ['student'], route: '/me/homework', built: true },
      { key: 'grades', labelKey: 'menu.grades', icon: 'stats-chart-outline', group: 'student_learning', roles: ['student'], route: '/grades', built: true },
      { key: 'courses', labelKey: 'menu.courses', icon: 'school-outline', group: 'student_learning', roles: ['student'], route: '/more/courses', built: false },
      
      // My Growth / O'sishim
      { key: 'coins', labelKey: 'menu.coins', icon: 'medal-outline', group: 'student_growth', roles: ['student'], route: '/me/coins', built: true },
      { key: 'achievements', labelKey: 'menu.achievements', icon: 'trophy-outline', group: 'student_growth', roles: ['student'], route: '/achievements', built: false },
      { key: 'portfolio', labelKey: 'menu.portfolio', icon: 'ribbon-outline', group: 'student_growth', roles: ['student'], route: '/more/portfolio', built: false },
      
      // Resources / Resurslar
      { key: 'announcements', labelKey: 'menu.announcements', icon: 'megaphone-outline', group: 'student_resources', roles: ['student'], route: '/announcements', built: true },
      { key: 'library', labelKey: 'menu.library', icon: 'library-outline', group: 'student_resources', roles: ['student'], route: '/more/library', built: true }, // Library ni true deymiz yoki false (tepada 3 ta false bo'ldi: courses, achievements, portfolio). Shuning uchun library ni true qilamiz va alert beramiz agar route ishlamasa. Yoki "built: false" lardan 3 tasi courses, achievements, portfolio bo'ldi.
    ];
  }

  const items = MENU.filter((m) => m.roles.includes(r));
  if (r === 'director') return items.filter((m) => DIRECTOR_MENU_KEYS.has(m.key));
  return items;
}
