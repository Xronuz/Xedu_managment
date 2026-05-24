/**
 * Xedu Navigation Configuration — Workflow-based, role-aware
 *
 * Philosophy:
 * - Sidebar represents institutional structure, not a flat feature list.
 * - Groups are workflow-based: Overview → Education → Operations → Finance → People → etc.
 * - Each role sees only the groups relevant to their daily work.
 * - All permissions derive from ROUTE_PERMISSIONS (single source of truth).
 */

import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, BookOpen, Calendar, GraduationCap,
  ClipboardList, BookMarked, CalendarCheck, BookCheck,
  Users, Briefcase, UserCog, Shield, FileText,
  TrendingUp, CreditCard, Award, Wallet, BarChart3,
  Brain, Megaphone, MessageSquare, Bell, Settings,
  Building2, Package, Library, Bus, School,
  ShoppingBag, Coins, Heart, ClipboardCheck,
  BarChart2,
} from 'lucide-react';
import { ROUTE_PERMISSIONS } from './permissions';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  /** If omitted, visible to all roles that can access the route */
  roles?: string[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ROLE-BASED NAVIGATION GROUPS
   ═══════════════════════════════════════════════════════════════════════════════ */

const ALL_STAFF = ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher', 'accountant', 'librarian'];

// ── DIRECTOR ──────────────────────────────────────────────────────────────────
export const DIRECTOR_NAV: NavGroup[] = [
  {
    title: 'Umumiy ko‘rinish',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
      { label: 'Filiallar', href: '/dashboard/branches', icon: Building2, roles: ROUTE_PERMISSIONS['/dashboard/branches'] },
      { label: 'Tasdiqlash inbox', href: '/dashboard/approvals', icon: FileText, roles: ROUTE_PERMISSIONS['/dashboard/approvals'] },
      { label: 'Ogohlantirishlar', href: '/dashboard/alerts', icon: Bell, roles: ROUTE_PERMISSIONS['/dashboard/alerts'] },
    ],
  },
  {
    // Sinflar, Dars jadvali, Fanlar — Ta'lim markazi tablarida mavjud
    title: "Ta'lim",
    items: [
      { label: "Ta'lim markazi", href: '/dashboard/education', icon: BookOpen, roles: ROUTE_PERMISSIONS['/dashboard/education'] },
      { label: 'Baholar', href: '/dashboard/grades', icon: GraduationCap, roles: ROUTE_PERMISSIONS['/dashboard/grades'] },
      { label: 'Imtihonlar', href: '/dashboard/exams', icon: ClipboardList, roles: ROUTE_PERMISSIONS['/dashboard/exams'] },
      { label: 'Davomat', href: '/dashboard/attendance', icon: CalendarCheck, roles: ROUTE_PERMISSIONS['/dashboard/attendance'] },
    ],
  },
  {
    // Ta'til so'rovlar — Tasdiqlash inbox (Ta'til tab) orqali boshqariladi
    title: 'Operatsiyalar',
    items: [
      { label: 'Intizom', href: '/dashboard/discipline', icon: Shield, roles: ROUTE_PERMISSIONS['/dashboard/discipline'] },
    ],
  },
  {
    // To'lovlar, Ish haqi, Tariflar — Moliya sahifasi tablarida mavjud
    title: 'Moliya',
    items: [
      { label: 'Moliya', href: '/dashboard/finance', icon: TrendingUp, roles: ROUTE_PERMISSIONS['/dashboard/finance'] },
    ],
  },
  {
    // Foydalanuvchilar — Cmd+K orqali yetarli
    title: 'Jamoa',
    items: [
      { label: "O'quvchilar", href: '/dashboard/students', icon: Users, roles: ROUTE_PERMISSIONS['/dashboard/students'] },
      { label: 'Xodimlar', href: '/dashboard/staff', icon: Briefcase, roles: ROUTE_PERMISSIONS['/dashboard/staff'] },
    ],
  },
  {
    title: 'Sotuv',
    items: [
      { label: 'CRM — Leadlar', href: '/dashboard/crm', icon: Megaphone, roles: ROUTE_PERMISSIONS['/dashboard/crm'] },
    ],
  },
  {
    title: 'Aloqa',
    items: [
      { label: 'Bildirishnomalar', href: '/dashboard/notifications', icon: Bell, roles: ROUTE_PERMISSIONS['/dashboard/notifications'] },
    ],
  },
  {
    // KPI, Insights — Hisobotlar sahifasi tablarida mavjud
    title: 'Analitika',
    items: [
      { label: 'Hisobotlar', href: '/dashboard/reports', icon: BarChart3, roles: ROUTE_PERMISSIONS['/dashboard/reports'] },
    ],
  },
  {
    title: 'Tizim',
    items: [
      { label: 'Sozlamalar', href: '/dashboard/settings', icon: Settings, roles: ROUTE_PERMISSIONS['/dashboard/settings'] },
    ],
  },
];

// ── BRANCH ADMIN ──────────────────────────────────────────────────────────────
export const BRANCH_ADMIN_NAV: NavGroup[] = [
  {
    title: 'Umumiy ko‘rinish',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: 'Operatsiyalar',
    items: [
      { label: 'Intizom', href: '/dashboard/discipline', icon: Shield, roles: ROUTE_PERMISSIONS['/dashboard/discipline'] },
      { label: "Ta'til so'rovlar", href: '/dashboard/leave-requests', icon: FileText, roles: ROUTE_PERMISSIONS['/dashboard/leave-requests'] },
    ],
  },
  {
    title: "Ta'lim",
    items: [
      { label: 'Dars jadvali', href: '/dashboard/schedule', icon: Calendar, roles: ROUTE_PERMISSIONS['/dashboard/schedule'] },
      { label: 'Davomat', href: '/dashboard/attendance', icon: CalendarCheck, roles: ROUTE_PERMISSIONS['/dashboard/attendance'] },
      { label: 'Sinflar', href: '/dashboard/classes', icon: School, roles: ROUTE_PERMISSIONS['/dashboard/classes'] },
      { label: 'Baholar', href: '/dashboard/grades', icon: GraduationCap, roles: ROUTE_PERMISSIONS['/dashboard/grades'] },
      { label: 'Imtihonlar', href: '/dashboard/exams', icon: ClipboardList, roles: ROUTE_PERMISSIONS['/dashboard/exams'] },
      { label: 'Fanlar', href: '/dashboard/subjects', icon: BookMarked, roles: ROUTE_PERMISSIONS['/dashboard/subjects'] },
    ],
  },
  {
    title: 'Jamoa',
    items: [
      { label: "O'quvchilar", href: '/dashboard/students', icon: Users, roles: ROUTE_PERMISSIONS['/dashboard/students'] },
      { label: 'Xodimlar', href: '/dashboard/staff', icon: Briefcase, roles: ROUTE_PERMISSIONS['/dashboard/staff'] },
      { label: 'Foydalanuvchilar', href: '/dashboard/users', icon: UserCog, roles: ROUTE_PERMISSIONS['/dashboard/users'] },
    ],
  },
  {
    title: 'Moliya',
    items: [
      { label: 'Moliya', href: '/dashboard/finance', icon: TrendingUp, roles: ROUTE_PERMISSIONS['/dashboard/finance'] },
      { label: "To'lovlar", href: '/dashboard/payments', icon: CreditCard, roles: ROUTE_PERMISSIONS['/dashboard/payments'] },
      { label: 'Tariflar', href: '/dashboard/fee-structures', icon: Wallet, roles: ROUTE_PERMISSIONS['/dashboard/fee-structures'] },
    ],
  },
  {
    title: 'Sotuv',
    items: [
      { label: 'CRM — Leadlar', href: '/dashboard/crm', icon: Megaphone, roles: ROUTE_PERMISSIONS['/dashboard/crm'] },
    ],
  },
  {
    title: 'Aloqa',
    items: [
      { label: 'Kommunikatsiya', href: '/dashboard/comms', icon: MessageSquare, roles: ROUTE_PERMISSIONS['/dashboard/comms'] },
      { label: 'Bildirishnomalar', href: '/dashboard/notifications', icon: Bell, roles: ROUTE_PERMISSIONS['/dashboard/notifications'] },
    ],
  },
  {
    title: 'Tizim',
    items: [
      { label: 'Sozlamalar', href: '/dashboard/settings', icon: Settings, roles: ROUTE_PERMISSIONS['/dashboard/settings'] },
    ],
  },
];

// ── VICE PRINCIPAL ────────────────────────────────────────────────────────────
export const VICE_PRINCIPAL_NAV: NavGroup[] = [
  {
    title: 'Umumiy ko‘rinish',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: "Ta'lim",
    items: [
      { label: "Ta'lim markazi", href: '/dashboard/education', icon: BookOpen, roles: ROUTE_PERMISSIONS['/dashboard/education'] },
      { label: 'Dars jadvali', href: '/dashboard/schedule', icon: Calendar, roles: ROUTE_PERMISSIONS['/dashboard/schedule'] },
      { label: 'Sinflar', href: '/dashboard/classes', icon: School, roles: ROUTE_PERMISSIONS['/dashboard/classes'] },
      { label: 'Baholar', href: '/dashboard/grades', icon: GraduationCap, roles: ROUTE_PERMISSIONS['/dashboard/grades'] },
      { label: 'Imtihonlar', href: '/dashboard/exams', icon: ClipboardList, roles: ROUTE_PERMISSIONS['/dashboard/exams'] },
      { label: 'Davomat', href: '/dashboard/attendance', icon: CalendarCheck, roles: ROUTE_PERMISSIONS['/dashboard/attendance'] },
    ],
  },
  {
    title: 'Operatsiyalar',
    items: [
      { label: 'Intizom', href: '/dashboard/discipline', icon: Shield, roles: ROUTE_PERMISSIONS['/dashboard/discipline'] },
      { label: "Ta'til so'rovlar", href: '/dashboard/leave-requests', icon: FileText, roles: ROUTE_PERMISSIONS['/dashboard/leave-requests'] },
    ],
  },
  {
    title: 'Jamoa',
    items: [
      { label: "O'quvchilar", href: '/dashboard/students', icon: Users, roles: ROUTE_PERMISSIONS['/dashboard/students'] },
      { label: 'Xodimlar', href: '/dashboard/staff', icon: Briefcase, roles: ROUTE_PERMISSIONS['/dashboard/staff'] },
    ],
  },
  {
    title: 'Sotuv',
    items: [
      { label: 'CRM — Leadlar', href: '/dashboard/crm', icon: Megaphone, roles: ROUTE_PERMISSIONS['/dashboard/crm'] },
    ],
  },
  {
    title: 'Analitika',
    items: [
      { label: 'Hisobotlar', href: '/dashboard/reports', icon: BarChart3, roles: ROUTE_PERMISSIONS['/dashboard/reports'] },
      { label: 'KPI Dashboard', href: '/dashboard/kpi', icon: TrendingUp, roles: ROUTE_PERMISSIONS['/dashboard/kpi'] },
    ],
  },
  {
    title: 'Tizim',
    items: [
      { label: 'Sozlamalar', href: '/dashboard/settings', icon: Settings, roles: ROUTE_PERMISSIONS['/dashboard/settings'] },
    ],
  },
];

// ── TEACHER / CLASS_TEACHER ───────────────────────────────────────────────────
export const TEACHER_NAV: NavGroup[] = [
  {
    title: 'Umumiy ko‘rinish',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: 'Sinflarim',
    items: [
      { label: 'Mening sinfim', href: '/dashboard/my-class', icon: BookCheck, roles: ROUTE_PERMISSIONS['/dashboard/my-class'] },
      { label: 'Dars jadvali', href: '/dashboard/schedule', icon: Calendar, roles: ROUTE_PERMISSIONS['/dashboard/schedule'] },
    ],
  },
  {
    title: 'Akademik',
    items: [
      { label: 'Davomat', href: '/dashboard/attendance', icon: CalendarCheck, roles: ROUTE_PERMISSIONS['/dashboard/attendance'] },
      { label: 'Baholar', href: '/dashboard/grades', icon: GraduationCap, roles: ROUTE_PERMISSIONS['/dashboard/grades'] },
      { label: 'Uy vazifalari', href: '/dashboard/homework', icon: BookMarked, roles: ROUTE_PERMISSIONS['/dashboard/homework'] },
      { label: 'Imtihonlar', href: '/dashboard/exams', icon: ClipboardList, roles: ROUTE_PERMISSIONS['/dashboard/exams'] },
    ],
  },
  {
    title: 'Aloqa',
    items: [
      { label: 'Kommunikatsiya', href: '/dashboard/comms', icon: MessageSquare, roles: ROUTE_PERMISSIONS['/dashboard/comms'] },
      { label: 'Bildirishnomalar', href: '/dashboard/notifications', icon: Bell, roles: ROUTE_PERMISSIONS['/dashboard/notifications'] },
    ],
  },
  {
    title: 'Analitika',
    items: [
      { label: 'Insights', href: '/dashboard/insights', icon: Brain, roles: ROUTE_PERMISSIONS['/dashboard/insights'] },
    ],
  },
];

// ── ACCOUNTANT ────────────────────────────────────────────────────────────────
export const ACCOUNTANT_NAV: NavGroup[] = [
  {
    title: 'Umumiy ko‘rinish',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: 'Moliya',
    items: [
      { label: 'Moliya', href: '/dashboard/finance', icon: TrendingUp, roles: ROUTE_PERMISSIONS['/dashboard/finance'] },
      { label: "To'lovlar", href: '/dashboard/payments', icon: CreditCard, roles: ROUTE_PERMISSIONS['/dashboard/payments'] },
      { label: 'Ish haqi', href: '/dashboard/payroll', icon: Award, roles: ROUTE_PERMISSIONS['/dashboard/payroll'] },
      { label: 'Tariflar', href: '/dashboard/fee-structures', icon: Wallet, roles: ROUTE_PERMISSIONS['/dashboard/fee-structures'] },
    ],
  },
  {
    title: 'Analitika',
    items: [
      { label: 'Hisobotlar', href: '/dashboard/reports', icon: BarChart3, roles: ROUTE_PERMISSIONS['/dashboard/reports'] },
    ],
  },
  {
    title: 'Tizim',
    items: [
      { label: 'Sozlamalar', href: '/dashboard/settings', icon: Settings, roles: ROUTE_PERMISSIONS['/dashboard/settings'] },
    ],
  },
];

// ── LIBRARIAN ─────────────────────────────────────────────────────────────────
export const LIBRARIAN_NAV: NavGroup[] = [
  {
    title: 'Umumiy ko‘rinish',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: 'Kutubxona',
    items: [
      { label: 'Kutubxona', href: '/dashboard/library', icon: Library, roles: ROUTE_PERMISSIONS['/dashboard/library'] },
      { label: 'Resurslar', href: '/dashboard/resources', icon: Package, roles: ROUTE_PERMISSIONS['/dashboard/resources'] },
    ],
  },
  {
    title: 'Tizim',
    items: [
      { label: 'Sozlamalar', href: '/dashboard/settings', icon: Settings, roles: ROUTE_PERMISSIONS['/dashboard/settings'] },
    ],
  },
];

// ── STUDENT ───────────────────────────────────────────────────────────────────
export const STUDENT_NAV: NavGroup[] = [
  {
    title: 'Umumiy ko‘rinish',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
      { label: "O'quvchi portal", href: '/dashboard/student', icon: GraduationCap, roles: ROUTE_PERMISSIONS['/dashboard/student'] },
    ],
  },
  {
    title: 'Darslarim',
    items: [
      { label: 'Dars jadvali', href: '/dashboard/schedule', icon: Calendar, roles: ROUTE_PERMISSIONS['/dashboard/schedule'] },
      { label: 'Uy vazifalari', href: '/dashboard/homework', icon: BookMarked, roles: ROUTE_PERMISSIONS['/dashboard/homework'] },
    ],
  },
  {
    title: 'Natijalar',
    items: [
      { label: 'Baholar', href: '/dashboard/grades', icon: BarChart2, roles: ROUTE_PERMISSIONS['/dashboard/grades'] },
      { label: 'Imtihonlar', href: '/dashboard/exams', icon: ClipboardList, roles: ROUTE_PERMISSIONS['/dashboard/exams'] },
      { label: 'Davomat', href: '/dashboard/attendance', icon: CalendarCheck, roles: ROUTE_PERMISSIONS['/dashboard/attendance'] },
    ],
  },
  {
    title: 'Resurslar',
    items: [
      { label: 'Kutubxona', href: '/dashboard/library', icon: Library, roles: ROUTE_PERMISSIONS['/dashboard/library'] },
      { label: 'Resurslar', href: '/dashboard/resources', icon: Package, roles: ROUTE_PERMISSIONS['/dashboard/resources'] },
      { label: "Do'kon", href: '/dashboard/student/shop', icon: ShoppingBag, roles: ROUTE_PERMISSIONS['/dashboard/student/shop'] },
      { label: 'EduCoin', href: '/dashboard/coins', icon: Coins, roles: ROUTE_PERMISSIONS['/dashboard/coins'] },
    ],
  },
];

// ── PARENT ────────────────────────────────────────────────────────────────────
export const PARENT_NAV: NavGroup[] = [
  {
    title: 'Farzandim',
    items: [
      { label: 'Farzand', href: '/dashboard/parent', icon: Heart, roles: ROUTE_PERMISSIONS['/dashboard/parent'] },
      { label: 'Davomat', href: '/dashboard/attendance', icon: CalendarCheck, roles: ROUTE_PERMISSIONS['/dashboard/attendance'] },
    ],
  },
  {
    title: 'Natijalar',
    items: [
      { label: 'Baholar', href: '/dashboard/grades', icon: BarChart2, roles: ROUTE_PERMISSIONS['/dashboard/grades'] },
      { label: 'Imtihonlar', href: '/dashboard/exams', icon: ClipboardList, roles: ROUTE_PERMISSIONS['/dashboard/exams'] },
      { label: 'Uy vazifalari', href: '/dashboard/homework', icon: BookMarked, roles: ROUTE_PERMISSIONS['/dashboard/homework'] },
    ],
  },
  {
    title: 'Moliya',
    items: [
      { label: "To'lovlar", href: '/dashboard/payments', icon: CreditCard, roles: ROUTE_PERMISSIONS['/dashboard/payments'] },
    ],
  },
  {
    title: 'Aloqa',
    items: [
      { label: 'Kommunikatsiya', href: '/dashboard/comms', icon: MessageSquare, roles: ROUTE_PERMISSIONS['/dashboard/comms'] },
      { label: 'Bildirishnomalar', href: '/dashboard/notifications', icon: Bell, roles: ROUTE_PERMISSIONS['/dashboard/notifications'] },
    ],
  },
];

// ── SUPER ADMIN ───────────────────────────────────────────────────────────────
export const SUPER_ADMIN_NAV: NavGroup[] = [
  {
    title: 'Platforma',
    items: [
      { label: 'Maktablar', href: '/dashboard/schools', icon: School, roles: ROUTE_PERMISSIONS['/dashboard/schools'] },
      { label: 'Tizim holati', href: '/dashboard/system-health', icon: TrendingUp, roles: ROUTE_PERMISSIONS['/dashboard/system-health'] },
      { label: 'Audit Log', href: '/dashboard/audit-log', icon: Shield, roles: ROUTE_PERMISSIONS['/dashboard/audit-log'] },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   NAVIGATION RESOLVER
   ═══════════════════════════════════════════════════════════════════════════════ */

const ROLE_NAV_MAP: Record<string, NavGroup[]> = {
  director:       DIRECTOR_NAV,
  vice_principal: VICE_PRINCIPAL_NAV,
  branch_admin:   BRANCH_ADMIN_NAV,
  teacher:        TEACHER_NAV,
  class_teacher:  TEACHER_NAV,
  accountant:     ACCOUNTANT_NAV,
  librarian:      LIBRARIAN_NAV,
  student:        STUDENT_NAV,
  parent:         PARENT_NAV,
  super_admin:    SUPER_ADMIN_NAV,
};

/**
 * Returns navigation groups for a given role.
 * Items are filtered by the role's route permissions automatically.
 */
export function getNavForRole(role: string): NavGroup[] {
  const groups = ROLE_NAV_MAP[role] ?? [];
  // Filter each group's items by role permissions
  return groups
    .map(group => ({
      ...group,
      items: group.items.filter(item =>
        !item.roles || item.roles.includes(role),
      ),
    }))
    .filter(group => group.items.length > 0);
}

/**
 * Get a flat list of all nav items for a role (for mobile / search indexing).
 */
export function getFlatNavForRole(role: string): NavItem[] {
  return getNavForRole(role).flatMap(g => g.items);
}
