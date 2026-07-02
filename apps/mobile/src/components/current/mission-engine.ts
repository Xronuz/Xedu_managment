import type { CompassProps } from './compass';
import type { LessonState } from '@/lib/gamify';

/**
 * CURRENT · MissionEngine — pure function.
 *
 * Given today's real state (homework, lessons, streak), computes the SINGLE
 * Compass mission — the one thing the student should do now. Replaces the old
 * 5-branch heroConfig + continue-learning block, collapsed to ONE dominant action.
 *
 * Priority (most urgent → least):
 *   1. overdue homework  → "Finish now" (warning tone, keep your streak)
 *   2. pending homework  → "Continue"
 *   3. active lesson now → "You're in class" (subtle, join context)
 *   4. upcoming lesson   → "Up next"
 *   5. all clear         → celebratory all-done (primary, completed-style)
 */
export interface MissionInput {
  overdue: any[];      // homework past due, not submitted
  pending: any[];      // homework not submitted
  activeLesson?: any | null;   // lesson happening right now
  upcomingLesson?: any | null; // next lesson today
  hasStreak: boolean;
}

export interface MissionOutput extends Omit<CompassProps, 'onPress'> {
  route: string;
}

export function computeMission(input: MissionInput): MissionOutput {
  const { overdue, pending, activeLesson, upcomingLesson, hasStreak } = input;

  // 1. Overdue — supportive, never punitive. "waiting", keep streak strong.
  if (overdue.length > 0) {
    const hw = overdue[0];
    return {
      icon: 'time',
      eyebrow: overdue.length > 1 ? `${overdue.length} waiting` : 'waiting',
      title: hw?.title ?? 'Vazifa kutyapti',
      subtitle: hasStreak ? 'Streakni saqlash uchun yakunlang' : (hw?.subject?.name ?? 'Muddati o\'tgan'),
      rewardLabel: '+15 XP',
      ctaLabel: 'Yakunlash',
      tone: 'warning',
      completed: false,
      route: '/me/homework',
    };
  }

  // 2. Pending homework — the day's main quest.
  if (pending.length > 0) {
    const hw = pending[0];
    return {
      icon: 'book',
      eyebrow: 'bugungi missiya',
      title: hw?.title ?? 'Uy vazifasi',
      subtitle: hw?.subject?.name ?? undefined,
      rewardLabel: '+15 XP',
      ctaLabel: 'Boshlash',
      tone: 'primary',
      completed: false,
      route: '/me/homework',
    };
  }

  // 3. Active lesson right now — "you're in class".
  if (activeLesson) {
    return {
      icon: 'radio-button-on',
      eyebrow: 'hozir davom etmoqda',
      title: activeLesson?.subject?.name ?? 'Dars',
      subtitle: activeLesson?.startTime ? `${activeLesson.startTime} boshlanadi` : undefined,
      ctaLabel: 'Tafsilotlar',
      tone: 'primary',
      completed: false,
      route: '/schedule',
    };
  }

  // 4. Upcoming lesson — "up next".
  if (upcomingLesson) {
    return {
      icon: 'arrow-forward-circle',
      eyebrow: upcomingLesson?.startTime ? `keyingisi ${upcomingLesson.startTime}` : 'keyingi dars',
      title: upcomingLesson?.subject?.name ?? 'Dars',
      subtitle: upcomingLesson?.subject?.name ?? undefined,
      ctaLabel: 'Jadvalni ko\'rish',
      tone: 'primary',
      completed: false,
      route: '/schedule',
    };
  }

  // 5. All clear — celebrate. Compass renders done-style.
  return {
    icon: 'checkmark-done',
    eyebrow: 'hammasi bajarilgan',
    title: 'Bugun barqaror',
    subtitle: hasStreak ? 'Streakni saqlab qoldingiz' : 'Vazifalar yo\'q — dam oling.',
    rewardLabel: undefined,
    ctaLabel: '',
    tone: 'primary',
    completed: true,
    route: '/schedule',
  };
}

/**
 * Derive today's ring completion from real lesson state + homework status.
 * done = lessons already finished + homework already submitted today.
 * total = lessons today + homework assigned today.
 */
export function computeRing(
  lessons: any[],
  lessonStateOf: (l: any) => LessonState,
  homework: any[],
): { done: number; total: number } {
  const lessonDone = lessons.filter((l) => lessonStateOf(l) === 'done').length;
  const hwDone = homework.filter((h) => h?.status === 'submitted' || h?.status === 'graded').length;
  const done = lessonDone + hwDone;

  const total = Math.max(lessons.length + homework.length, 1);
  return { done, total };
}
