/**
 * Role-based bottom tab config (MOBILE_FOUNDATION_SPEC §1.1).
 *
 * Bitta yagona manba — `PillTabBar` (ko'rsatish tartibi) va `(app)/_layout.tsx`
 * (tab visibility `href`) shu yerdan o'qiydi. Maksimal 5 tab ko'rinadi.
 *
 * Qoida: `index` (Home) har doim birinchi, `menu`/`messages`/`profile`
 * oxirida — bo'sh joy bo'lsa. Kunlik workflow (schedule, today, classes,
 * children, ...) o'rtada.
 */
import type { AppRole } from './permissions';

export type TabName =
  | 'index'
  | 'schedule'
  | 'grades'
  | 'homework'
  | 'today'
  | 'classes'
  | 'children'
  | 'attendance'
  | 'students'
  | 'payments'
  | 'finance'
  | 'library'
  | 'alerts'
  | 'approvals'
  | 'schools'
  | 'system'
  | 'menu'
  | 'messages'
  | 'notifications'
  | 'profile';

/**
 * Har role uchun bottom tab tartibi (chap→o'ng). `PillTabBar` shu arrayni
 * `order` sifatida ishlatadi. `_layout.tsx` esa har bir name uchun
 * `href: TAB_CONFIG[role].includes(name) ? undefined : null` qiladi.
 *
 * `menu` har doim bor — MenuHub orqali qolgan barchasi ochiladi.
 */
export const TAB_CONFIG: Record<AppRole, TabName[]> = {
  student:        ['index', 'schedule', 'grades', 'menu', 'messages', 'profile'],
  teacher:        ['index', 'today', 'classes', 'menu', 'messages', 'profile'],
  class_teacher:  ['index', 'today', 'classes', 'menu', 'messages', 'profile'],
  parent:         ['index', 'children', 'menu', 'messages', 'profile'],
  director:       ['index', 'alerts', 'approvals', 'menu', 'messages', 'profile'],
  vice_principal: ['index', 'schedule', 'students', 'menu', 'messages', 'profile'],
  branch_admin:   ['index', 'attendance', 'students', 'menu', 'payments', 'profile'],
  accountant:     ['index', 'payments', 'finance', 'menu', 'students', 'profile'],
  librarian:      ['index', 'library', 'menu', 'messages', 'profile'],
  super_admin:    ['index', 'schools', 'system', 'menu', 'profile'],
};

/**
 * PillTabBar ikonkalari — har tab uchun `on` (filled) / `off` (outline).
 * Yangi tab qo'shilganda shu yerga ham qo'shish shart.
 */
export const TAB_ICONS: Record<TabName, { on: string; off: string }> = {
  index:         { on: 'home',             off: 'home-outline' },
  schedule:      { on: 'calendar',         off: 'calendar-outline' },
  grades:        { on: 'stats-chart',      off: 'stats-chart-outline' },
  homework:      { on: 'book',             off: 'book-outline' },
  today:         { on: 'today',            off: 'today-outline' },
  classes:       { on: 'school',           off: 'school-outline' },
  children:      { on: 'people',           off: 'people-outline' },
  attendance:    { on: 'checkmark-done-circle', off: 'checkmark-done-circle-outline' },
  students:      { on: 'school',           off: 'school-outline' },
  payments:      { on: 'card',             off: 'card-outline' },
  finance:       { on: 'pie-chart',        off: 'pie-chart-outline' },
  library:       { on: 'library',          off: 'library-outline' },
  alerts:        { on: 'warning',          off: 'warning-outline' },
  approvals:     { on: 'checkmark-done',   off: 'checkmark-done-outline' },
  schools:       { on: 'business',         off: 'business-outline' },
  system:        { on: 'heart-circle',     off: 'heart-circle-outline' },
  menu:          { on: 'grid',             off: 'grid-outline' },
  messages:      { on: 'chatbubbles',      off: 'chatbubbles-outline' },
  notifications: { on: 'notifications',    off: 'notifications-outline' },
  profile:       { on: 'person',           off: 'person-outline' },
};

/** Tab'lar uchun badge manbai (notifications yoki messages). */
export const TAB_BADGE_SOURCES: Partial<Record<TabName, 'notifications' | 'messages'>> = {
  notifications: 'notifications',
  messages: 'messages',
};

/** Berilgan role uchun tab order'ni qaytaradi (xavfsiz — unknown → default). */
export function tabsForRole(role: string): TabName[] {
  const r = (role || '').toLowerCase().trim() as AppRole;
  return TAB_CONFIG[r] ?? TAB_CONFIG.parent;
}

/** Berilgan role uchun tab name visible? */
export function isTabVisible(role: string, tabName: string): boolean {
  return tabsForRole(role).includes(tabName as TabName);
}
