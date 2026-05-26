import { WeekType } from '@eduplatform/types';

/** ISO hafta raqami asosida weekType aniqlash */
export function getCurrentWeekType(): WeekType {
  const now = new Date();
  const isoWeek = getISOWeek(now);
  return isoWeek % 2 === 1 ? WeekType.NUMERATOR : WeekType.DENOMINATOR;
}

export function getISOWeek(date: Date): number {
  // UTC-safe ISO week calculation to handle Prisma @db.Date fields correctly
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNr = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNr + 3);
  const firstThursday = d.getTime();
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  if (yearStart.getUTCDay() !== 4) {
    yearStart.setUTCDate(1 + ((4 - yearStart.getUTCDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - yearStart.getTime()) / 604800000);
}

/**
 * Hafta turi filtri uchun Prisma where shartini yaratish.
 * Joriy hafta turi NUMERATOR bo'lsa → ALL + NUMERATOR
 * Joriy hafta turi DENOMINATOR bo'lsa → ALL + DENOMINATOR
 */
export function buildWeekTypeFilter(weekType?: WeekType): { in: WeekType[] } | undefined {
  if (!weekType) {
    weekType = getCurrentWeekType();
  }
  return { in: [WeekType.ALL, weekType] };
}
