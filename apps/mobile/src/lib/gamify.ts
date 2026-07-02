/**
 * O'quvchi gamifikatsiyasi — tangalardan "daraja" hisoblash (mijoz tomonida,
 * o'yinli ko'rinish uchun). Backend qiymati emas; sof vizual rag'bat.
 * Har daraja = 100 tanga.
 */
const COINS_PER_LEVEL = 100;

export function levelFromCoins(coins: number): {
  level: number;
  current: number; // joriy darajadagi tangalar
  needed: number; // keyingi darajagacha kerak
  progress: number; // 0..1
} {
  const safe = Math.max(0, Math.floor(coins || 0));
  const level = Math.floor(safe / COINS_PER_LEVEL) + 1;
  const current = safe % COINS_PER_LEVEL;
  return { level, current, needed: COINS_PER_LEVEL, progress: current / COINS_PER_LEVEL };
}

// ── Yosh-adaptiv tier (3–11 sinf bitta tajribada) ────────────────────────────
export type StudentTier = 'junior' | 'middle' | 'senior';

/** Sinf raqamidan tier. junior 1–5, middle 6–8, senior 9–11. Noma'lum → middle (xavfsiz). */
export function studentTier(gradeLevel?: number | null): StudentTier {
  if (gradeLevel == null || !Number.isFinite(gradeLevel)) return 'middle';
  if (gradeLevel <= 5) return 'junior';
  if (gradeLevel <= 8) return 'middle';
  return 'senior';
}

interface AttRecord { date: string; status: string }
const PRESENTISH = new Set(['present', 'late', 'excused']);

/** Davomatdan ketma-ket "kelgan" kunlar (streak) — bugundan orqaga. */
export function streakFromAttendance(history?: AttRecord[]): number {
  if (!history || history.length === 0) return 0;
  // sana bo'yicha kamayuvchi tartib, kunlar bo'yicha unik
  const byDay = new Map<string, string>();
  for (const r of history) {
    const day = (r.date || '').slice(0, 10);
    if (day && !byDay.has(day)) byDay.set(day, r.status);
  }
  const days = [...byDay.keys()].sort((a, b) => (a < b ? 1 : -1));
  let streak = 0;
  for (const d of days) {
    if (PRESENTISH.has(byDay.get(d) ?? '')) streak++;
    else break;
  }
  return streak;
}

/** So'nggi 7 yozuvdagi davomat foizi (0–100) yoki ma'lumot yo'q bo'lsa null. */
export function weekAttendanceRate(history?: AttRecord[]): number | null {
  if (!history || history.length === 0) return null;
  const recent = history.slice(0, 14);
  const present = recent.filter((r) => PRESENTISH.has(r.status)).length;
  return Math.round((present / recent.length) * 100);
}

// ── Dars holati (haqiqiy vaqt bo'yicha) ──────────────────────────────────────
export type LessonState = 'done' | 'active' | 'upcoming';

const LESSON_DURATION_MIN = 45; // standart dars davomiyligi (endTime yo'q bo'lsa)

/** "HH:MM" → minut (00:00 dan boshlab). Noto'g'ri bo'lsa null. */
function parseHHMM(s?: string | null): number | null {
  if (!s || typeof s !== 'string') return null;
  const m = s.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
}

/**
 * Darsning joriy holatini haqiqiy vaqtga nisbatan hisoblaydi.
 * scheduleToday'dagi `timeSlot` (0 → 07:00) yoki `startTime` ("08:00")
 * va xohlashicha `endTime` dan foydalanadi.
 *
 * `now` parametri testlash uchun; e'tiborsiz qoldirilsa joriy vaqt.
 *
 * Eskiroq mock (`isDone = i === 0`) o'rniga — ilova endi haqiqatga sodiql.
 */
export function lessonStateAt(
  lesson: { startTime?: string | null; endTime?: string | null; timeSlot?: number | null },
  now: Date = new Date(),
): LessonState {
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // timeSlot → startMin (0 → 07:00, 1 → 08:00 ...)
  let startMin = parseHHMM(lesson.startTime);
  if (startMin == null && typeof lesson.timeSlot === 'number') {
    startMin = (7 + lesson.timeSlot) * 60;
  }
  if (startMin == null) return 'upcoming'; // vaqtsiz darsni "kelajak" deb olamiz

  const endMin = parseHHMM(lesson.endTime) ?? startMin + LESSON_DURATION_MIN;

  if (nowMin >= endMin) return 'done';
  if (nowMin >= startMin) return 'active';
  return 'upcoming';
}
