import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'UZS') {
  if (currency === 'UZS') {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' so‘m';
  }
  return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency }).format(amount);
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  }).format(new Date(date));
}

export function getInitials(firstName?: string | null, lastName?: string | null) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '—';
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    super_admin: 'Super Admin',
    director: 'Maktab direktori',
    branch_admin: 'Filial boshqaruvchisi',
    vice_principal: 'Mudir o‘rinbosari',
    teacher: 'O‘qituvchi',
    class_teacher: 'Sinf rahbari',
    accountant: 'Moliyachi',
    librarian: 'Kutubxonachi',
    student: 'O‘quvchi',
    parent: 'Ota-ona',
  };
  return labels[role] ?? role;
}

export function getCompactRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    super_admin: 'Super Admin',
    director: 'Direktor',
    branch_admin: 'Filial admin',
    vice_principal: 'O‘rinbosar',
    teacher: 'O‘qituvchi',
    class_teacher: 'Sinf rahbari',
    accountant: 'Buxgalter',
    librarian: 'Kutubxonachi',
    student: 'O‘quvchi',
    parent: 'Ota-ona',
  };
  return labels[role] ?? role;
}

export function getAttendanceLabel(status: string): string {
  const labels: Record<string, string> = {
    present: 'Keldi',
    absent: 'Kelmadi',
    late: 'Kechikdi',
    excused: 'Uzrli',
  };
  return labels[status] ?? status;
}

export function getGradeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    homework: 'Uy ishi',
    classwork: 'Sinf ishi',
    test: 'Test',
    exam: 'Imtihon',
    quarterly: 'Choraklik',
    final: 'Yakuniy',
  };
  return labels[type] ?? type;
}

export function getScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'var(--xedu-slate-400)';
  if (score >= 90) return 'var(--xedu-primary)';
  if (score >= 70) return '#84cc16';
  if (score >= 50) return 'var(--xedu-amber)';
  return 'var(--xedu-ruby)';
}

export function getScoreColorClass(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'text-xedu-slate-400';
  if (score >= 90) return 'text-xedu-primary';
  if (score >= 70) return 'text-lime-500';
  if (score >= 50) return 'text-xedu-amber';
  return 'text-xedu-ruby';
}

import { DayOfWeek } from '@eduplatform/types';

const DAYS_ORDER: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
];

/**
 * Map JS Date.getDay() to DayOfWeek enum.
 * JS getDay(): 0=Sun, 1=Mon, ..., 6=Sat
 * @returns DayOfWeek or null if non-school day (Sunday not enabled)
 */
export function jsDayToTimetableDay(
  jsDayIndex: number,
  includeSunday = false,
): DayOfWeek | null {
  if (jsDayIndex === 0) {
    return includeSunday ? DayOfWeek.SUNDAY : null;
  }
  return DAYS_ORDER[jsDayIndex - 1] ?? null;
}

/** Get the index of a DayOfWeek in the standard school-week order (Mon=0..Sat=5). */
export function timetableDayIndex(day: DayOfWeek): number {
  return DAYS_ORDER.indexOf(day);
}
