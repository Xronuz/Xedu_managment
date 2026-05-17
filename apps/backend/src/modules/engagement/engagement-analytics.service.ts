import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface ClassParticipationMetrics {
  classId: string;
  className: string;
  totalStudents: number;
  homeworkCompletionRate: number;
  attendanceRate: number;
  averageEngagementScore: number;
}

export interface RewardDistributionMetrics {
  teacherId: string;
  teacherName: string;
  totalAwarded: number;
  studentCount: number;
  averagePerStudent: number;
  fairnessScore: number; // 0-100, higher = more evenly distributed
}

export interface AccountabilityDistributionMetrics {
  totalDeductions: number;
  uniqueStudents: number;
  averageDeduction: number;
  recoveryRate: number; // % of students who recovered
}

export interface EngagementTrendPoint {
  date: string;
  participationScore: number;
  rewardCount: number;
  deductionCount: number;
}

@Injectable()
export class EngagementAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sinf ishtiroki metrikalari
   */
  async getClassParticipation(schoolId: string, classId?: string): Promise<ClassParticipationMetrics[]> {
    const classes = await this.prisma.class.findMany({
      where: { schoolId, ...(classId ? { id: classId } : {}) },
      include: {
        students: { select: { studentId: true } },
        _count: { select: { students: true } },
      },
    });

    const results: ClassParticipationMetrics[] = [];

    for (const cls of classes) {
      const studentIds = cls.students.map((s) => s.studentId);
      if (studentIds.length === 0) continue;

      // Uyga vazifa bajarilish darajasi
      const totalHomeworks = await this.prisma.homework.count({
        where: { classId: cls.id },
      });
      const totalSubmissions = totalHomeworks > 0
        ? await this.prisma.homeworkSubmission.count({
            where: { studentId: { in: studentIds } },
          })
        : 0;
      const homeworkCompletionRate = totalHomeworks > 0
        ? Math.min(100, (totalSubmissions / (totalHomeworks * studentIds.length)) * 100)
        : 0;

      // Davomat darajasi
      const totalAttendanceRecords = await this.prisma.attendance.count({
        where: { studentId: { in: studentIds } },
      });
      const presentRecords = await this.prisma.attendance.count({
        where: { studentId: { in: studentIds }, status: 'present' },
      });
      const attendanceRate = totalAttendanceRecords > 0
        ? (presentRecords / totalAttendanceRecords) * 100
        : 0;

      // O'rtacha engagement bali
      const reputations = await this.prisma.engagementReputation.findMany({
        where: { userId: { in: studentIds } },
      });
      const avgScore = reputations.length > 0
        ? reputations.reduce((sum, r) => sum + r.score, 0) / reputations.length
        : 100;

      results.push({
        classId: cls.id,
        className: cls.name,
        totalStudents: studentIds.length,
        homeworkCompletionRate: Math.round(homeworkCompletionRate * 10) / 10,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        averageEngagementScore: Math.round(avgScore * 10) / 10,
      });
    }

    return results;
  }

  /**
   * Mukofot taqsimoti adolati
   */
  async getRewardDistribution(
    schoolId: string,
    days = 30,
  ): Promise<RewardDistributionMetrics[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const awards = await this.prisma.coinTransaction.findMany({
      where: {
        schoolId,
        type: 'earn',
        awardedBy: { not: null },
        createdAt: { gte: since },
      },
      select: {
        amount: true,
        userId: true,
        awardedBy: true,
      },
    });

    const teacherMap = new Map<string, { total: number; students: Set<string>; amounts: number[] }>();

    for (const a of awards) {
      if (!a.awardedBy) continue;
      const entry = teacherMap.get(a.awardedBy) ?? { total: 0, students: new Set<string>(), amounts: [] };
      entry.total += a.amount;
      entry.students.add(a.userId);
      entry.amounts.push(a.amount);
      teacherMap.set(a.awardedBy, entry);
    }

    const teachers = await this.prisma.user.findMany({
      where: { id: { in: Array.from(teacherMap.keys()) } },
      select: { id: true, firstName: true, lastName: true },
    });
    const teacherNames = new Map(teachers.map((t) => [t.id, `${t.firstName} ${t.lastName}`]));

    return Array.from(teacherMap.entries()).map(([teacherId, data]) => {
      const avg = data.amounts.length > 0 ? data.total / data.amounts.length : 0;
      // Adolat bali: hamma o'quvchilarga o'xshash miqdor berilganda 100
      const variance = data.amounts.length > 1
        ? data.amounts.reduce((sum, a) => sum + Math.pow(a - avg, 2), 0) / data.amounts.length
        : 0;
      const fairnessScore = Math.max(0, 100 - Math.sqrt(variance) * 2);

      return {
        teacherId,
        teacherName: teacherNames.get(teacherId) ?? 'Noma‘lum',
        totalAwarded: data.total,
        studentCount: data.students.size,
        averagePerStudent: data.students.size > 0 ? Math.round(data.total / data.students.size) : 0,
        fairnessScore: Math.round(fairnessScore),
      };
    });
  }

  /**
   * Hisobdorlik taqsimoti
   */
  async getAccountabilityDistribution(
    schoolId: string,
    days = 30,
  ): Promise<AccountabilityDistributionMetrics> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const deductions = await this.prisma.coinTransaction.findMany({
      where: {
        schoolId,
        type: 'deduct',
        createdAt: { gte: since },
      },
      select: { amount: true, userId: true },
    });

    const uniqueStudents = new Set(deductions.map((d) => d.userId));
    const totalDeductions = deductions.length;
    const totalAmount = deductions.reduce((sum, d) => sum + Math.abs(d.amount), 0);

    // Tiklanish darajasi
    const recovered = await this.prisma.engagementReputation.count({
      where: {
        schoolId,
        userId: { in: Array.from(uniqueStudents) },
        recoveredAt: { not: null },
      },
    });

    return {
      totalDeductions,
      uniqueStudents: uniqueStudents.size,
      averageDeduction: totalDeductions > 0 ? Math.round(totalAmount / totalDeductions) : 0,
      recoveryRate: uniqueStudents.size > 0 ? Math.round((recovered / uniqueStudents.size) * 100) : 0,
    };
  }

  /**
   * Engagement dinamikasi
   */
  async getEngagementTrend(
    schoolId: string,
    days = 30,
  ): Promise<EngagementTrendPoint[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const transactions = await this.prisma.coinTransaction.findMany({
      where: { schoolId, createdAt: { gte: since } },
      select: { type: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const dateMap = new Map<string, { rewards: number; deductions: number }>();

    for (const tx of transactions) {
      const date = tx.createdAt.toISOString().split('T')[0];
      const entry = dateMap.get(date) ?? { rewards: 0, deductions: 0 };
      if (tx.type === 'earn') entry.rewards++;
      else entry.deductions++;
      dateMap.set(date, entry);
    }

    // Barcha kunlarni to'ldirish
    const result: EngagementTrendPoint[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const entry = dateMap.get(dateStr) ?? { rewards: 0, deductions: 0 };
      const total = entry.rewards + entry.deductions;
      result.push({
        date: dateStr,
        participationScore: total > 0 ? Math.round((entry.rewards / total) * 100) : 100,
        rewardCount: entry.rewards,
        deductionCount: entry.deductions,
      });
    }

    return result;
  }

  /**
   * Imtihon va engagement o'rtasidagi bog'liqlik
   */
  async getExamEngagementCorrelation(
    schoolId: string,
    days = 90,
  ): Promise<{
    correlationCoefficient: number;
    sampleSize: number;
    insight: string;
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const students = await this.prisma.user.findMany({
      where: { schoolId, role: 'student' },
      select: { id: true, coins: true },
    });

    const correlations: { coins: number; avgScore: number }[] = [];

    for (const student of students) {
      const grades = await this.prisma.grade.findMany({
        where: { studentId: student.id, createdAt: { gte: since } },
        select: { score: true },
      });
      if (grades.length === 0) continue;

      const avgScore = grades.reduce((sum, g) => sum + g.score, 0) / grades.length;
      correlations.push({ coins: student.coins, avgScore });
    }

    if (correlations.length < 5) {
      return { correlationCoefficient: 0, sampleSize: correlations.length, insight: "Yetarli ma'lumot yo'q" };
    }

    // Pearson correlation
    const n = correlations.length;
    const sumX = correlations.reduce((s, c) => s + c.coins, 0);
    const sumY = correlations.reduce((s, c) => s + c.avgScore, 0);
    const sumXY = correlations.reduce((s, c) => s + c.coins * c.avgScore, 0);
    const sumX2 = correlations.reduce((s, c) => s + c.coins * c.coins, 0);
    const sumY2 = correlations.reduce((s, c) => s + c.avgScore * c.avgScore, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const r = denominator === 0 ? 0 : numerator / denominator;

    let insight: string;
    if (r > 0.3) insight = "Engagement va akademik natijalar o'rtasida ijobiy bog'liqlik mavjud";
    else if (r < -0.3) insight = "Engagement va akademik natijalar o'rtasida salbiy bog'liqlik mavjud";
    else insight = "Engagement va akademik natijalar o'rtasida kuchli bog'liqlik yo'q";

    return {
      correlationCoefficient: Math.round(r * 100) / 100,
      sampleSize: n,
      insight,
    };
  }
}
