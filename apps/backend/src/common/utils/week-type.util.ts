import { WeekType } from '@eduplatform/types';

/** ISO hafta raqami asosida weekType aniqlash */
export function getCurrentWeekType(): WeekType {
  const now = new Date();
  const isoWeek = getISOWeek(now);
  return isoWeek % 2 === 1 ? WeekType.NUMERATOR : WeekType.DENOMINATOR;
}

export function getISOWeek(date: Date): number {
  const tmp = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  tmp.setDate(tmp.getDate() - dayNr + 3);
  const firstThursday = tmp.valueOf();
  tmp.setMonth(0, 1);
  if (tmp.getDay() !== 4) {
    tmp.setMonth(0, 1 + ((4 - tmp.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - tmp.valueOf()) / 604800000);
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
