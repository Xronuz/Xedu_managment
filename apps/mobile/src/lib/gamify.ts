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

/** O'quvchi plitkalari uchun yorqin, do'stona ranglar. */
export const PLAYFUL_COLORS = {
  blue: '#3B82F6',
  green: '#10B981',
  amber: '#F59E0B',
  purple: '#8B5CF6',
  pink: '#EC4899',
  cyan: '#06B6D4',
};
