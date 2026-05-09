import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EngagementConfigService } from './engagement-config.service';
import { AchievementCategory } from '@prisma/client';

export interface AchievementCriteria {
  type: string;
  threshold: number;
  window?: string; // 'days', 'weeks', 'months'
  subjectId?: string;
}

export interface AchievementSeed {
  name: string;
  description: string;
  category: AchievementCategory;
  criteria: AchievementCriteria;
  rewardCoins: number;
}

// ─── Default institutional achievements ─────────────────────────────────────

export const DEFAULT_ACHIEVEMENTS: AchievementSeed[] = [
  {
    name: "Uyga vazifa intizomi",
    description: "Ketma-ket 5 ta uyga vazifani o'z vaqtida topshirish",
    category: AchievementCategory.academic_effort,
    criteria: { type: 'homework_streak', threshold: 5, window: 'days' },
    rewardCoins: 15,
  },
  {
    name: "Davomat ishonchi",
    description: "30 kun davomida uzluksiz davomat",
    category: AchievementCategory.attendance,
    criteria: { type: 'attendance_streak', threshold: 30, window: 'days' },
    rewardCoins: 30,
  },
  {
    name: "Fan ustasi",
    description: "Bir fandan 1 oy davomida 90+ o'rtacha baho",
    category: AchievementCategory.academic_effort,
    criteria: { type: 'subject_mastery', threshold: 90, window: 'months' },
    rewardCoins: 25,
  },
  {
    name: "O'sish yo'lichi",
    description: "Bahoda 10+ ball o'sish",
    category: AchievementCategory.improvement,
    criteria: { type: 'grade_improvement', threshold: 10, window: 'months' },
    rewardCoins: 20,
  },
  {
    name: "Faol ishtirokchi",
    description: "10 ta sinf ishtiroki",
    category: AchievementCategory.participation,
    criteria: { type: 'participation_count', threshold: 10, window: 'months' },
    rewardCoins: 15,
  },
  {
    name: "Intizom tiklash",
    description: "Jarimadan keyin 30 kun davomida intizomli xulq-atvor",
    category: AchievementCategory.recovery,
    criteria: { type: 'clean_streak_after_deduction', threshold: 30, window: 'days' },
    rewardCoins: 25,
  },
  {
    name: "Oylik imtihon — a'lo",
    description: "Oylik imtihonda 90% dan yuqori natija",
    category: AchievementCategory.academic_effort,
    criteria: { type: 'exam_high_score', threshold: 90, window: 'months' },
    rewardCoins: 20,
  },
  {
    name: "Mashq davomiyligi",
    description: "10 ta uyga vazifani o'z vaqtida topshirish",
    category: AchievementCategory.academic_effort,
    criteria: { type: 'homework_count', threshold: 10, window: 'days' },
    rewardCoins: 15,
  },
];

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class AchievementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engagementConfig: EngagementConfigService,
  ) {}

  /**
   * Maktab uchun standart mukofotlarni yaratish
   */
  async seedDefaultAchievements(schoolId: string): Promise<void> {
    const existing = await this.prisma.achievement.count({ where: { schoolId } });
    if (existing > 0) return;

    await this.prisma.achievement.createMany({
      data: DEFAULT_ACHIEVEMENTS.map((a) => ({
        schoolId,
        name: a.name,
        description: a.description,
        category: a.category,
        criteria: a.criteria as any,
        rewardCoins: a.rewardCoins,
        isActive: true,
        isPositive: true,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * Barcha mukofotlarni olish (o'quvchi progressi bilan)
   */
  async listWithProgress(userId: string, schoolId: string) {
    const achievements = await this.prisma.achievement.findMany({
      where: { schoolId, isActive: true },
      orderBy: { category: 'asc' },
    });

    const userAchievements = await this.prisma.userAchievement.findMany({
      where: { userId },
    });

    const progressMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua]));

    return achievements.map((ach) => {
      const ua = progressMap.get(ach.id);
      const criteria = ach.criteria as unknown as AchievementCriteria;
      const progress = (ua?.progress as any) ?? { current: 0, target: criteria.threshold };
      return {
        ...ach,
        criteria,
        progress,
        unlockedAt: ua?.unlockedAt ?? null,
        isUnlocked: !!ua?.unlockedAt,
      };
    });
  }

  /**
   * Hodisa yuz berganda mukofot progressini tekshirish
   */
  async checkAndProgress(
    userId: string,
    schoolId: string,
    eventType: string,
    eventData?: Record<string, unknown>,
  ): Promise<{ unlocked: boolean; achievementName?: string; rewardCoins?: number }[]> {
    const achievements = await this.prisma.achievement.findMany({
      where: { schoolId, isActive: true, isPositive: true },
    });

    const results: { unlocked: boolean; achievementName?: string; rewardCoins?: number }[] = [];

    for (const ach of achievements) {
      const criteria = ach.criteria as unknown as AchievementCriteria;
      if (criteria.type !== eventType) continue;

      const shouldUnlock = await this.evaluateCriteria(userId, criteria, eventData);
      if (!shouldUnlock) continue;

      const existing = await this.prisma.userAchievement.findUnique({
        where: { userId_achievementId: { userId, achievementId: ach.id } },
      });

      if (existing?.unlockedAt) continue;

      await this.prisma.userAchievement.upsert({
        where: { userId_achievementId: { userId, achievementId: ach.id } },
        create: {
          userId,
          achievementId: ach.id,
          progress: { current: criteria.threshold, target: criteria.threshold },
          unlockedAt: new Date(),
        },
        update: {
          progress: { current: criteria.threshold, target: criteria.threshold },
          unlockedAt: new Date(),
        },
      });

      results.push({
        unlocked: true,
        achievementName: ach.name,
        rewardCoins: ach.rewardCoins,
      });
    }

    return results;
  }

  /**
   * Mezonlarni baholash
   */
  private async evaluateCriteria(
    userId: string,
    criteria: AchievementCriteria,
    eventData?: Record<string, unknown>,
  ): Promise<boolean> {
    switch (criteria.type) {
      case 'homework_streak':
      case 'homework_count': {
        const count = await this.prisma.homeworkSubmission.count({
          where: {
            studentId: userId,
            submittedAt: { gte: this.getWindowDate(criteria.window ?? 'days', criteria.threshold) },
          },
        });
        return count >= criteria.threshold;
      }
      case 'attendance_streak': {
        const streak = await this.calculateAttendanceStreak(userId, criteria.threshold);
        return streak >= criteria.threshold;
      }
      case 'exam_high_score': {
        const score = eventData?.score as number;
        return score !== undefined && score >= criteria.threshold;
      }
      case 'grade_improvement': {
        // Bu murakkabroq — Phase 27 da to'liq implementatsiya
        return false;
      }
      case 'participation_count': {
        // Bu murakkabroq — Phase 27 da to'liq implementatsiya
        return false;
      }
      case 'clean_streak_after_deduction': {
        const rep = await this.prisma.engagementReputation.findUnique({ where: { userId } });
        if (!rep?.lastDeductionAt) return false;
        const daysSince = Math.floor(
          (Date.now() - rep.lastDeductionAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        return daysSince >= criteria.threshold;
      }
      default:
        return false;
    }
  }

  private getWindowDate(window: string, amount: number): Date {
    const now = new Date();
    switch (window) {
      case 'days':
        return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000);
      case 'weeks':
        return new Date(now.getTime() - amount * 7 * 24 * 60 * 60 * 1000);
      case 'months':
        return new Date(now.getFullYear(), now.getMonth() - amount, now.getDate());
      default:
        return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000);
    }
  }

  private async calculateAttendanceStreak(userId: string, threshold: number): Promise<number> {
    const records = await this.prisma.attendance.findMany({
      where: { studentId: userId },
      orderBy: { date: 'desc' },
      take: threshold * 2,
      select: { date: true, status: true },
    });

    let streak = 0;
    for (const r of records) {
      if (r.status === 'present' || r.status === 'excused') {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }
}
