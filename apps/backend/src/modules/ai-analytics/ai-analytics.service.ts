import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';

// -- Rule breakdown: har bir signal uchun alohida hissa -----------------------
export interface RuleBreakdown {
  attendance: {
    score:     number;   // risk hissasi (0-30)
    rate:      number;   // haqiqiy davomat % (30 kun)
    triggered: boolean;
  };
  gpa: {
    score:     number;   // risk hissasi (0-25)
    value:     number;   // 0-5 shkala
    triggered: boolean;
  };
  gpaDrop: {
    score:       number;   // risk hissasi (0-15)
    dropPct:     number;   // so'nggi 4 hafta vs avvalgi 4 hafta farqi (%)
    triggered:   boolean;
    skipped:     boolean;  // true = minimum sample yetmadi
  };
  payment: {
    score:          number;  // risk hissasi (0-20)
    overdueMonths:  number;  // distinct kechikkan oylar soni
    triggered:      boolean;
  };
  discipline: {
    score:     number;   // risk hissasi (0-15)
    incidents: number;   // 30 kun ichida hodisalar
    triggered: boolean;
  };
  homework: {
    score:       number;  // risk hissasi (0-10)
    completion:  number;  // % (topshirilgan / berilgan)
    triggered:   boolean;
  };
  trendPenalty: {
    score:     number;   // bonus risk (0, 5, yoki 10)
    weeks:     number;   // ketma-ket pasaygan haftalar soni
    triggered: boolean;
  };
}

export interface WeeklyTrend {
  week:           number;  // 1 = hozirdan 1 hafta oldin
  attendanceRate: number;
  avgGrade:       number;
}

export type TrendAlertType =
  | 'attendance_decline'
  | 'gpa_decline'
  | 'homework_decline'
  | 'payment_risk'
  | 'discipline_spike';

export type TrendAlertSeverity  = 'info' | 'warning' | 'critical';
export type TrendAlertConfidence = 'low' | 'medium' | 'high';

export interface TrendAlert {
  type:              TrendAlertType;
  severity:          TrendAlertSeverity;
  confidence:        TrendAlertConfidence; // Guard 3
  title:             string;
  description:       string;
  metric:            string;
  previousValue:     number;
  currentValue:      number;
  changePct:         number;
  weeks:             number;
  sampleCount?:      number;       // GPA uchun nechta baho ishlatildi
  recommendedAction: string;
}

export interface StudentRiskProfile {
  studentId:              string;
  firstName:              string;
  lastName:               string;
  className?:             string;
  branchName?:            string;
  riskScore:              number;            // 0-100, yuqori = xavfli
  riskLevel:              'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  // --- Raw metrics ---------------------------------------------------------
  gpa:                    number;
  attendanceRate:         number;
  homeworkCompletion:     number;
  disciplineIncidents:    number;
  lastGradeTrend:         'IMPROVING' | 'STABLE' | 'DECLINING';
  consecutiveDecliningWeeks: number;
  // --- Explainability ------------------------------------------------------
  ruleBreakdown:          RuleBreakdown;
  weeklyTrend:            WeeklyTrend[];     // so'nggi 8 hafta
  primaryReason:          string;
  trendAlerts:            TrendAlert[];
  alertCount:             number;
  criticalAlertCount:     number;
  recommendations:        string[];
}

// --- Rule Engine constants ----------------------------------------------------
const RULES = {
  ATTENDANCE_THRESHOLD: 80,  // % dan past bo'lsa trigger
  ATTENDANCE_MAX:       30,  // maksimal risk hissasi
  GPA_THRESHOLD:        3.0, // 5 ballik skalada
  GPA_MAX:              25,
  GPA_DROP_THRESHOLD:   15,  // % dan ko'p tushsa trigger
  GPA_DROP_MAX:         15,
  PAYMENT_MAX:          20,  // 2 oy = 20 ball (10/oy)
  DISCIPLINE_THRESHOLD: 3,   // 30 kun ichida
  DISCIPLINE_MAX:       15,
  HOMEWORK_THRESHOLD:   60,  // % dan past
  HOMEWORK_MAX:         10,
} as const;

@Injectable()
export class AiAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // -- Haftalik davomat trendini hisoblash ------------------------------------
  private async getWeeklyTrend(
    studentId: string,
    schoolId:  string,
    weeks:     number = 8,
  ): Promise<WeeklyTrend[]> {
    const trend: WeeklyTrend[] = [];
    const now = new Date();

    for (let w = 1; w <= weeks; w++) {
      const weekEnd   = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - (w - 1) * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      const [att, grades] = await Promise.all([
        this.prisma.attendance.findMany({
          where: { studentId, schoolId, date: { gte: weekStart, lt: weekEnd } },
          select: { status: true },
        }),
        this.prisma.grade.findMany({
          where: {
            studentId, schoolId,
            date:      { gte: weekStart, lt: weekEnd },
            deletedAt: null,
            maxScore:  { gt: 0 },
          },
          select: { score: true, maxScore: true },
        }),
      ]);

      const attRate = att.length > 0
        ? (att.filter(a => a.status === 'present').length / att.length) * 100
        : 100;

      const avgGrade = grades.length > 0
        ? (grades.reduce((s, g) => s + (g.score / g.maxScore) * 5, 0) / grades.length)
        : 0;

      trend.push({ week: w, attendanceRate: Math.round(attRate * 10) / 10, avgGrade: Math.round(avgGrade * 10) / 10 });
    }

    return trend;
  }

  // -- Ketma-ket pasayish haftalarini sanash ----------------------------------
  private countConsecutiveDecline(trend: WeeklyTrend[]): number {
    // trend[0] = bu hafta, trend[1] = o'tgan hafta, ...
    // Birinchi haftadan boshlab qaysi haftadan pasayish boshlangan
    let count = 0;
    for (let i = 0; i < trend.length - 1; i++) {
      if (trend[i].attendanceRate < trend[i + 1].attendanceRate) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  // -- Asosiy risk hisoblash --------------------------------------------------
  // -- Trend alert hisoblash (existing data'dan — N+1 yo'q) -----------------
  private computeTrendAlerts(
    weeklyTrend:          WeeklyTrend[],
    recentGradesAvg:      number | null,
    olderGradesAvg:       number | null,
    recentGradeCount:     number,
    olderGradeCount:      number,
    homeworkCompletion:   number,
    disciplineIncidents:  number,
    overdueMonths:        number,
    userRole:             string = 'director',
  ): TrendAlert[] {
    const raw: TrendAlert[] = [];
    const validAtt = weeklyTrend.filter(t => t.attendanceRate >= 0);

    // Helper: attendance confidence from sample weeks
    const attConf = (weeks: number): TrendAlertConfidence =>
      weeks >= 6 ? 'high' : weeks >= 3 ? 'medium' : 'low';

    // Helper: GPA confidence from sample count (Guard 3)
    const gpaConf = (n: number): TrendAlertConfidence =>
      n >= 6 ? 'high' : n >= 3 ? 'medium' : 'low';

    // ─── Alert 1a: Attendance consecutive decline ────────────────────────────
    let consecutiveAlert: TrendAlert | null = null;
    if (validAtt.length >= 3) {
      let consecutive = 0;
      for (let i = 0; i < validAtt.length - 1; i++) {
        if (validAtt[i].attendanceRate < validAtt[i + 1].attendanceRate) consecutive++;
        else break;
      }
      if (consecutive >= 3) {
        const current  = validAtt[0].attendanceRate;
        const previous = validAtt[consecutive].attendanceRate;
        const changePct = previous > 0 ? ((current - previous) / previous) * 100 : 0;
        consecutiveAlert = {
          type:              'attendance_decline',
          severity:          consecutive >= 4 ? 'critical' : 'warning',
          confidence:        attConf(consecutive),
          title:             `Davomat ${consecutive} hafta ketma-ket pasaymoqda`,
          description:       `${consecutive} hafta davomida davomat ${previous.toFixed(0)}% dan ${current.toFixed(0)}% ga tushdi`,
          metric:            'attendanceRate',
          previousValue:     Math.round(previous  * 10) / 10,
          currentValue:      Math.round(current   * 10) / 10,
          changePct:         Math.round(changePct * 10) / 10,
          weeks:             consecutive,
          recommendedAction: "O'quvchi bilan shaxsiy suhbat o'tkazing va ota-onasini xabardor qiling",
        };
      }
    }

    // ─── Alert 1b: Attendance 4-week average drop ────────────────────────────
    let avgDeclAlert: TrendAlert | null = null;
    if (validAtt.length >= 6) {
      const recent4 = validAtt.slice(0, 4).map(t => t.attendanceRate);
      const older4  = validAtt.slice(4, 8).filter(t => t.attendanceRate >= 0).map(t => t.attendanceRate);
      if (recent4.length >= 3 && older4.length >= 2) {
        const recentAvg = recent4.reduce((s, v) => s + v, 0) / recent4.length;
        const olderAvg  = older4.reduce((s, v)  => s + v, 0) / older4.length;
        const changePct = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
        if (changePct < -15) {
          avgDeclAlert = {
            type:              'attendance_decline',
            severity:          changePct < -25 ? 'critical' : 'warning',
            confidence:        attConf(recent4.length + older4.length),
            title:             "Davomat keskin tushdi (4 hafta o'rtacha)",
            description:       `So'nggi 4 hafta: ${recentAvg.toFixed(0)}% | Avvalgi: ${olderAvg.toFixed(0)}%`,
            metric:            'attendanceRate',
            previousValue:     Math.round(olderAvg  * 10) / 10,
            currentValue:      Math.round(recentAvg * 10) / 10,
            changePct:         Math.round(changePct * 10) / 10,
            weeks:             4,
            recommendedAction: "Davomat sabablari aniqlansin, zarur bo'lsa ota-ona bilan uchrashuv",
          };
        }
      }
    }

    // ─── Guard 1: Deduplication — attendance_decline ─────────────────────────
    // Ikkalasi ham bo'lsa, eng og'ir severity'li birini qoldiramiz
    if (consecutiveAlert && avgDeclAlert) {
      const sevWeight = { critical: 2, warning: 1, info: 0 };
      const winner = sevWeight[consecutiveAlert.severity] >= sevWeight[avgDeclAlert.severity]
        ? consecutiveAlert
        : avgDeclAlert;
      // Description'ni boyitamiz (ikkalasi trigger qilganini ko'rsatamiz)
      raw.push({
        ...winner,
        description: winner.description + ' (ketma-ket pasayish ham aniqlandi)',
      });
    } else if (consecutiveAlert) {
      raw.push(consecutiveAlert);
    } else if (avgDeclAlert) {
      raw.push(avgDeclAlert);
    }

    // ─── Alert 2: GPA decline (Guard 3: confidence) ──────────────────────────
    const GPA_MIN_SAMPLE = 3;
    if (
      recentGradesAvg !== null && olderGradesAvg !== null &&
      recentGradeCount >= GPA_MIN_SAMPLE && olderGradeCount >= GPA_MIN_SAMPLE &&
      olderGradesAvg > 0
    ) {
      const changePct   = ((recentGradesAvg - olderGradesAvg) / olderGradesAvg) * 100;
      const totalSample = recentGradeCount + olderGradeCount;
      if (changePct < -15) {
        const currentGpa  = recentGradesAvg * 5;
        const previousGpa = olderGradesAvg  * 5;
        raw.push({
          type:              'gpa_decline',
          severity:          changePct < -25 ? 'critical' : 'warning',
          confidence:        gpaConf(Math.min(recentGradeCount, olderGradeCount)),
          title:             'GPA keskin pasaydi',
          description:       `So'nggi 4 hafta: ${currentGpa.toFixed(1)}/5 | Avvalgi: ${previousGpa.toFixed(1)}/5 (${Math.abs(Math.round(changePct))}% tushish)`,
          metric:            'gpa',
          previousValue:     Math.round(previousGpa * 10) / 10,
          currentValue:      Math.round(currentGpa  * 10) / 10,
          changePct:         Math.round(changePct   * 10) / 10,
          weeks:             4,
          sampleCount:       totalSample,
          recommendedAction: "O'qituvchi bilan qo'shimcha mashg'ulot rejalashtiring",
        });
      }
    }

    // ─── Alert 3: Homework ───────────────────────────────────────────────────
    if (homeworkCompletion < 40) {
      raw.push({
        type:              'homework_decline',
        severity:          homeworkCompletion < 25 ? 'critical' : 'warning',
        confidence:        'medium',
        title:             'Uy vazifalari juda past bajarilmoqda',
        description:       `Bajarilish: ${homeworkCompletion.toFixed(0)}%`,
        metric:            'homeworkCompletion',
        previousValue:     60,
        currentValue:      Math.round(homeworkCompletion * 10) / 10,
        changePct:         Math.round(((homeworkCompletion - 60) / 60) * 100),
        weeks:             4,
        recommendedAction: "Sinf rahbari bilan uy vazifalari nazoratini mustahkamlang",
      });
    }

    // ─── Alert 4: Payment ────────────────────────────────────────────────────
    if (overdueMonths >= 2) {
      raw.push({
        type:              'payment_risk',
        severity:          overdueMonths >= 3 ? 'critical' : 'warning',
        confidence:        'high',   // payment data aniq
        title:             `To'lov ${overdueMonths} oy kechikmoqda`,
        description:       `${overdueMonths} ta oylik to'lov kechikkan`,
        metric:            'overdueMonths',
        previousValue:     0,
        currentValue:      overdueMonths,
        changePct:         -100,
        weeks:             overdueMonths * 4,
        recommendedAction: "Moliya bo'limi bilan bog'laning, ota-onaga to'lov eslatmasi yuboring",
      });
    }

    // ─── Alert 5: Discipline ─────────────────────────────────────────────────
    if (disciplineIncidents >= 3) {
      raw.push({
        type:              'discipline_spike',
        severity:          disciplineIncidents >= 5 ? 'critical' : 'warning',
        confidence:        'high',   // discipline data aniq
        title:             "Intizom hodisalari ko'paydi",
        description:       `30 kun ichida ${disciplineIncidents} ta hodisa qayd etildi`,
        metric:            'disciplineIncidents',
        previousValue:     0,
        currentValue:      disciplineIncidents,
        changePct:         -100,
        weeks:             4,
        recommendedAction: "Psixolog yoki klassruk bilan uchrashuv tashkil eting",
      });
    }


    // -- Guard 2: Role-based priority sort ----------------------------------------
    const SEV_WEIGHT: Record<TrendAlertSeverity, number> = { critical: 100, warning: 50, info: 10 };
    // Role bo'yicha type prioriteti
    const TYPE_PRIORITY: Partial<Record<string, Record<TrendAlertType, number>>> = {
      director:      { payment_risk: 5, gpa_decline: 4, attendance_decline: 3, homework_decline: 2, discipline_spike: 1 },
      vice_principal:{ gpa_decline: 5, attendance_decline: 4, discipline_spike: 3, homework_decline: 2, payment_risk: 1 },
      class_teacher: { attendance_decline: 5, homework_decline: 4, gpa_decline: 3, discipline_spike: 2, payment_risk: 1 },
    };
    const DEFAULT_PRIORITY: Record<TrendAlertType, number> = {
      payment_risk: 5, gpa_decline: 4, attendance_decline: 3, homework_decline: 2, discipline_spike: 1,
    };
    const TYPE_WEIGHT = TYPE_PRIORITY[userRole] ?? DEFAULT_PRIORITY;

    return raw.sort((a, b) =>
      (SEV_WEIGHT[b.severity] + TYPE_WEIGHT[b.type]) -
      (SEV_WEIGHT[a.severity] + TYPE_WEIGHT[a.type])
    );
  }


      private computeRiskScore(
    attendanceRate:        number,
    gpa:                   number,
    gpaDrop:               number,   // %
    gpaDropSkipped:        boolean,  // Fix 1: minimum sample yetmadi
    overdueMonths:         number,   // Fix 2: distinct calendar months
    disciplineCount:       number,
    homeworkPct:           number,
    consecutiveDeclining:  number,   // Fix 4: trend penalty
  ): { score: number; breakdown: RuleBreakdown } {

    // Signal 1 — Attendance: < 80% -> maks 30 ball
    const attTriggered = attendanceRate < RULES.ATTENDANCE_THRESHOLD;
    const attScore = attTriggered
      ? Math.min(RULES.ATTENDANCE_MAX, Math.round(
          (RULES.ATTENDANCE_THRESHOLD - attendanceRate) / RULES.ATTENDANCE_THRESHOLD * RULES.ATTENDANCE_MAX
        ))
      : 0;

    // Signal 2 — GPA: < 3.0 -> maks 25 ball
    const gpaTriggered = gpa < RULES.GPA_THRESHOLD;
    const gpaScore = gpaTriggered
      ? Math.min(RULES.GPA_MAX, Math.round(
          (RULES.GPA_THRESHOLD - gpa) / RULES.GPA_THRESHOLD * RULES.GPA_MAX
        ))
      : 0;

    // Signal 3 — GPA drop: > 15% tushsa -> maks 15 ball
    // Fix 1: gpaDropSkipped=true bo'lsa (sample yetarli emas) — trigger bo'lmaydi
    const gpaDropTriggered = !gpaDropSkipped && gpaDrop > RULES.GPA_DROP_THRESHOLD;
    const gpaDropScore = gpaDropTriggered
      ? Math.min(RULES.GPA_DROP_MAX, Math.round(
          (gpaDrop - RULES.GPA_DROP_THRESHOLD) / RULES.GPA_DROP_THRESHOLD * RULES.GPA_DROP_MAX
        ))
      : 0;

    // Signal 4 — Payment: maks 20 ball (Fix 2: distinct months)
    const payTriggered = overdueMonths > 0;
    const payScore = Math.min(RULES.PAYMENT_MAX, overdueMonths * 10);

    // Signal 5 — Discipline: > 3 hodisa -> maks 15 ball
    const discTriggered = disciplineCount > RULES.DISCIPLINE_THRESHOLD;
    const discScore = discTriggered
      ? Math.min(RULES.DISCIPLINE_MAX, disciplineCount * 3)
      : disciplineCount > 0 ? disciplineCount * 2 : 0;

    // Signal 6 — Homework: < 60% -> maks 10 ball
    const hwTriggered = homeworkPct < RULES.HOMEWORK_THRESHOLD;
    const hwScore = hwTriggered
      ? Math.min(RULES.HOMEWORK_MAX, Math.round(
          (RULES.HOMEWORK_THRESHOLD - homeworkPct) / RULES.HOMEWORK_THRESHOLD * RULES.HOMEWORK_MAX
        ))
      : 0;

    // Fix 4 — Trend penalty: asosiy score'dan alohida accelerator
    const trendScore  = consecutiveDeclining >= 3 ? 10 : consecutiveDeclining >= 2 ? 5 : 0;
    const trendTriggered = trendScore > 0;

    const baseSignals = attScore + gpaScore + gpaDropScore + payScore + discScore + hwScore;
    const total       = Math.min(100, baseSignals + trendScore);

    const breakdown: RuleBreakdown = {
      attendance:   { score: attScore,      rate: attendanceRate,           triggered: attTriggered      },
      gpa:          { score: gpaScore,      value: gpa,                     triggered: gpaTriggered      },
      gpaDrop:      { score: gpaDropScore,  dropPct: gpaDrop,               triggered: gpaDropTriggered, skipped: gpaDropSkipped },
      payment:      { score: payScore,      overdueMonths,                  triggered: payTriggered      },
      discipline:   { score: discScore,     incidents: disciplineCount,     triggered: discTriggered     },
      homework:     { score: hwScore,       completion: homeworkPct,        triggered: hwTriggered       },
      trendPenalty: { score: trendScore,    weeks: consecutiveDeclining,    triggered: trendTriggered    },
    };

    return { score: total, breakdown };
  }

  // -- Student risk profillarini hisoblash ------------------------------------
  async getStudentRiskProfiles(user: JwtPayload): Promise<StudentRiskProfile[]> {
    const where = buildTenantWhere(user);

    // 1. O'quvchilar ro'yxati (sinf va filial bilan)
    const students = await this.prisma.user.findMany({
      where:  { ...where, role: 'student', isActive: true },
      select: {
        id: true, firstName: true, lastName: true,
        studentClasses: {
          where:  { class: { schoolId: user.schoolId! } },
          select: { class: { select: { id: true, name: true, gradeLevel: true } } },
          take: 1,
        },
        branch: { select: { name: true } },
      },
      orderBy: { lastName: 'asc' },
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fourWeeksAgo  = new Date(now);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const eightWeeksAgo = new Date(now);
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    // 2. Barcha kerakli ma'lumotlarni parallel olish (N+1 ni oldini olish)
    const studentIds = students.map(s => s.id);

    const [
      allAttendance30d,
      allGrades56d,
      allDiscipline30d,
      allOverduePayments,
    ] = await Promise.all([
      // Davomat — so'nggi 30 kun
      this.prisma.attendance.findMany({
        where: { studentId: { in: studentIds }, schoolId: user.schoolId!, date: { gte: thirtyDaysAgo } },
        select: { studentId: true, status: true, date: true },
      }),
      // Baholar — so'nggi 8 hafta (trend uchun)
      this.prisma.grade.findMany({
        where: {
          studentId: { in: studentIds },
          schoolId:  user.schoolId!,
          date:      { gte: eightWeeksAgo },
          deletedAt: null,
          maxScore:  { gt: 0 },
        },
        select: { studentId: true, score: true, maxScore: true, date: true },
        orderBy: { date: 'desc' },
      }),
      // Intizom — so'nggi 30 kun
      this.prisma.disciplineIncident.groupBy({
        by:    ['studentId'],
        where: { studentId: { in: studentIds }, schoolId: user.schoolId!, createdAt: { gte: thirtyDaysAgo } },
        _count: { id: true },
      }),
      // Kechikkan to'lovlar
      this.prisma.payment.findMany({
        where: {
          studentId: { in: studentIds },
          schoolId:  user.schoolId!,
          status:    'overdue',
        },
        select: { studentId: true, dueDate: true },
      }),
    ]);

    // Uy vazifalari: O'quvchi sinfi bo'yicha berilgan vs topshirilgan
    // Sinf IDlarini bir marta olamiz
    const classIds = [...new Set(
      students.flatMap(s => s.studentClasses.map(sc => sc.class.id))
    )];

    const [homeworkAssigned, homeworkSubmitted] = await Promise.all([
      // Har bir sinf uchun berilgan uy vazifalari soni
      this.prisma.homework.groupBy({
        by:    ['classId'],
        where: { classId: { in: classIds }, schoolId: user.schoolId! },
        _count: { _all: true },
      }),
      // Har bir o'quvchi uchun topshirilgan uy vazifalari
      this.prisma.homeworkSubmission.groupBy({
        by:     ['studentId'],
        where:  { studentId: { in: studentIds }, submittedAt: { not: undefined } },
        _count: { _all: true },
      }),
    ]);

    // Index structures for fast lookup
    const attByStudent   = new Map<string, typeof allAttendance30d>();
    const gradeByStudent = new Map<string, typeof allGrades56d>();

    for (const a of allAttendance30d) {
      if (!attByStudent.has(a.studentId)) attByStudent.set(a.studentId, []);
      attByStudent.get(a.studentId)!.push(a);
    }
    for (const g of allGrades56d) {
      if (!gradeByStudent.has(g.studentId)) gradeByStudent.set(g.studentId, []);
      gradeByStudent.get(g.studentId)!.push(g);
    }

    const disciplineMap    = new Map(allDiscipline30d.map(d => [d.studentId, d._count.id]));
    const hwAssignedMap    = new Map(homeworkAssigned.map(h => [h.classId, h._count._all]));
    const hwSubmittedMap   = new Map(homeworkSubmitted.map(h => [h.studentId, h._count._all]));

    // Fix 2: distinct calendar months — bir oyda nechta payment bo'lishidan qat'i nazar 1 oy
    const overdueMonthsByStudent = new Map<string, Set<string>>();
    for (const pay of allOverduePayments) {
      const monthKey = pay.dueDate
        ? new Date(pay.dueDate).toISOString().slice(0, 7)  // "2026-04"
        : new Date().toISOString().slice(0, 7);
      if (!overdueMonthsByStudent.has(pay.studentId)) {
        overdueMonthsByStudent.set(pay.studentId, new Set());
      }
      overdueMonthsByStudent.get(pay.studentId)!.add(monthKey);
    }
    const overdueMap = new Map<string, number>(
      Array.from(overdueMonthsByStudent.entries()).map(([sid, months]) => [sid, months.size])
    );

    // 3. Har bir o'quvchi uchun hisoblash
    const profiles: StudentRiskProfile[] = [];

    for (const student of students) {
      const classId = student.studentClasses[0]?.class?.id;
      const att     = attByStudent.get(student.id) ?? [];
      const grades  = gradeByStudent.get(student.id) ?? [];

      // -- Attendance rate ----------------------------------------------------
      const presentCount  = att.filter(a => a.status === 'present').length;
      const attendanceRate = att.length > 0 ? (presentCount / att.length) * 100 : 100;

      // -- GPA (so'nggi 8 hafta) -----------------------------------------------
      const validGrades = grades.filter(g => g.maxScore > 0);
      const avgPct = validGrades.length > 0
        ? validGrades.reduce((s, g) => s + (g.score / g.maxScore) * 100, 0) / validGrades.length
        : 100;
      const gpa = (avgPct / 100) * 5;

      // -- GPA drop: so'nggi 4 hafta vs oldingi 4 hafta ----------------------
      const recentGrades = validGrades.filter(g => new Date(g.date) >= fourWeeksAgo);
      const olderGrades  = validGrades.filter(g => new Date(g.date) < fourWeeksAgo);

      // Fix 1: minimum 3 ta baho bo'lmasa gpaDrop hisoblanmaydi (false positive oldini olish)
      const GPA_MIN_SAMPLE = 3;
      let gpaDrop = 0;
      let gpaDropSkipped = false;
      if (recentGrades.length >= GPA_MIN_SAMPLE && olderGrades.length >= GPA_MIN_SAMPLE) {
        const recentAvg = recentGrades.reduce((s, g) => s + g.score / g.maxScore, 0) / recentGrades.length;
        const olderAvg  = olderGrades.reduce((s, g) => s + g.score / g.maxScore, 0) / olderGrades.length;
        if (olderAvg > 0 && olderAvg > recentAvg) {
          gpaDrop = ((olderAvg - recentAvg) / olderAvg) * 100;
        }
      } else {
        gpaDropSkipped = true; // sample yetarli emas — signal o'chirildi
      }

      // -- Grade trend (IMPROVING / STABLE / DECLINING) -----------------------
      let lastGradeTrend: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE';
      if (recentGrades.length > 0 && olderGrades.length > 0) {
        const recentAvg = recentGrades.reduce((s, g) => s + g.score / g.maxScore, 0) / recentGrades.length;
        const olderAvg  = olderGrades.reduce((s, g) => s + g.score / g.maxScore, 0) / olderGrades.length;
        if (recentAvg > olderAvg + 0.05)      lastGradeTrend = 'IMPROVING';
        else if (recentAvg < olderAvg - 0.05) lastGradeTrend = 'DECLINING';
      }

      // -- Homework completion ------------------------------------------------
      const assigned  = classId ? (hwAssignedMap.get(classId)  ?? 0) : 0;
      const submitted = hwSubmittedMap.get(student.id) ?? 0;
      const homeworkCompletion = assigned > 0 ? Math.min(100, (submitted / assigned) * 100) : 100;

      // -- Payment debt --------------------------------------------------------
      const overdueMonths = overdueMap.get(student.id) ?? 0;

      // -- Discipline ---------------------------------------------------------
      const disciplineIncidents = disciplineMap.get(student.id) ?? 0;

      // -- Weekly trend (davomat + baho) --------------------------------------
      const weeklyTrend: WeeklyTrend[] = [];
      const attList = att.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const gradeList = validGrades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      for (let w = 1; w <= 8; w++) {
        const wEnd   = new Date(now); wEnd.setDate(wEnd.getDate() - (w - 1) * 7);
        const wStart = new Date(now); wStart.setDate(wStart.getDate() - w * 7);

        const wAtt    = attList.filter(a => new Date(a.date) >= wStart && new Date(a.date) < wEnd);
        const wGrades = gradeList.filter(g => new Date(g.date) >= wStart && new Date(g.date) < wEnd);

        const wRate = wAtt.length > 0
          ? (wAtt.filter(a => a.status === 'present').length / wAtt.length) * 100
          : null;
        const wGpa  = wGrades.length > 0
          ? wGrades.reduce((s, g) => s + (g.score / g.maxScore) * 5, 0) / wGrades.length
          : null;

        weeklyTrend.push({
          week:           w,
          attendanceRate: wRate !== null ? Math.round(wRate * 10) / 10 : -1,
          avgGrade:       wGpa  !== null ? Math.round(wGpa  * 10) / 10 : -1,
        });
      }

      // Ketma-ket pasayish haftalar (faqat ma'lumot bo'lgan haftalar bo'yicha)
      const validTrend = weeklyTrend.filter(t => t.attendanceRate >= 0);
      let consecutiveDecliningWeeks = 0;
      for (let i = 0; i < validTrend.length - 1; i++) {
        if (validTrend[i].attendanceRate < validTrend[i + 1].attendanceRate) {
          consecutiveDecliningWeeks++;
        } else break;
      }

      // -- Rule Engine (Fix 1+2+4 integrated) ---------------------------------
      const { score: riskScore, breakdown } = this.computeRiskScore(
        attendanceRate, gpa, gpaDrop, gpaDropSkipped,
        overdueMonths, disciplineIncidents, homeworkCompletion,
        consecutiveDecliningWeeks,
      );

      // Risk level
      let riskLevel: StudentRiskProfile['riskLevel'];
      if (riskScore >= 70)      riskLevel = 'CRITICAL';
      else if (riskScore >= 50) riskLevel = 'HIGH';
      else if (riskScore >= 25) riskLevel = 'MEDIUM';
      else                      riskLevel = 'LOW';

      // -- Tavsiyalar (triggered rule'larga asoslanadi) -----------------------
      const recommendations: string[] = [];
      if (breakdown.attendance.triggered)
        recommendations.push(`Davomat juda past (${Math.round(breakdown.attendance.rate)}%) — individual suhbat o'tkazing`);
      if (breakdown.gpaDrop.triggered)
        recommendations.push(`Baho ${Math.round(breakdown.gpaDrop.dropPct)}% ga tushgan — qo'shimcha darslar kerak`);
      if (breakdown.gpa.triggered)
        recommendations.push(`GPA past (${breakdown.gpa.value.toFixed(1)}/5) — o'qituvchi bilan maslahat`);
      if (breakdown.payment.triggered)
        recommendations.push(`${breakdown.payment.overdueMonths} oy to'lov kechikmoqda — moliyaviy bo'lim bilan bog'laning`);
      if (breakdown.discipline.triggered)
        recommendations.push(`${breakdown.discipline.incidents} ta intizom hodisasi — ota-ona bilan uchrashuv tashkil eting`);
      if (breakdown.homework.triggered)
        recommendations.push(`Uy vazifalari bajarish ${Math.round(breakdown.homework.completion)}% — nazoratni kuchaytiring`);
      if (consecutiveDecliningWeeks >= 3)
        recommendations.push(`Davomat ${consecutiveDecliningWeeks} hafta ketma-ket pasaymoqda — zudlik bilan chora ko'ring`);
      if (recommendations.length === 0)
        recommendations.push('Barqaror natijalar — muvaffaqiyatlarini rag\'batlantiring');

      // Fix 3 — primaryReason: eng yuqori score'li 1-2 triggered signal
      const signalLabels: Record<string, string> = {
        attendance:   'davomat',
        gpa:          'GPA',
        gpaDrop:      'GPA pasayishi',
        payment:      'to\'lov qarzdorligi',
        discipline:   'intizom',
        homework:     'uy vazifasi',
        trendPenalty: 'davomat trendi',
      };
      const allSignals = [
        { key: 'attendance',   score: breakdown.attendance.score,   triggered: breakdown.attendance.triggered },
        { key: 'gpa',          score: breakdown.gpa.score,          triggered: breakdown.gpa.triggered },
        { key: 'gpaDrop',      score: breakdown.gpaDrop.score,      triggered: breakdown.gpaDrop.triggered },
        { key: 'payment',      score: breakdown.payment.score,      triggered: breakdown.payment.triggered },
        { key: 'discipline',   score: breakdown.discipline.score,   triggered: breakdown.discipline.triggered },
        { key: 'homework',     score: breakdown.homework.score,     triggered: breakdown.homework.triggered },
        { key: 'trendPenalty', score: breakdown.trendPenalty.score, triggered: breakdown.trendPenalty.triggered },
      ];
      const top2 = allSignals
        .filter(s => s.triggered && s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map(s => signalLabels[s.key]);

      const primaryReason = top2.length > 0
        ? `Asosiy sabab: ${top2.join(' va ')}`
        : 'Barqaror holat';

      // -- Phase 2: Trend Alerts (no new queries — existing data only) ---------
      // recentGrades/olderGrades already computed above for GPA drop
      const recentGradesAvg = recentGrades.length > 0
        ? recentGrades.reduce((s, g) => s + g.score / g.maxScore, 0) / recentGrades.length
        : null;
      const olderGradesAvg = olderGrades.length > 0
        ? olderGrades.reduce((s, g) => s + g.score / g.maxScore, 0) / olderGrades.length
        : null;

      const trendAlerts = this.computeTrendAlerts(
        weeklyTrend,
        recentGradesAvg,
        olderGradesAvg,
        recentGrades.length,
        olderGrades.length,
        homeworkCompletion,
        disciplineIncidents,
        overdueMonths,
        user.role,        // role-based priority (Guard 2)
      );

      profiles.push({
        studentId:   student.id,
        firstName:   student.firstName,
        lastName:    student.lastName,
        className:   student.studentClasses[0]?.class?.name,
        branchName:  student.branch?.name,
        riskScore:   Math.round(riskScore),
        riskLevel,
        gpa:                    Math.round(gpa * 10) / 10,
        attendanceRate:         Math.round(attendanceRate * 10) / 10,
        homeworkCompletion:     Math.round(homeworkCompletion * 10) / 10,
        disciplineIncidents,
        lastGradeTrend,
        consecutiveDecliningWeeks,
        ruleBreakdown:          breakdown,
        weeklyTrend,
        primaryReason,
        trendAlerts,
        alertCount:             trendAlerts.length,
        criticalAlertCount:     trendAlerts.filter(a => a.severity === 'critical').length,
        recommendations,
      });
    }

    return profiles.sort((a, b) => b.riskScore - a.riskScore);
  }

  // -- Dashboard summary ------------------------------------------------------
  async getDashboardSummary(user: JwtPayload) {
    const profiles = await this.getStudentRiskProfiles(user);
    const total    = profiles.length;

    const critical = profiles.filter(p => p.riskLevel === 'CRITICAL').length;
    const high     = profiles.filter(p => p.riskLevel === 'HIGH').length;
    const medium   = profiles.filter(p => p.riskLevel === 'MEDIUM').length;
    const low      = profiles.filter(p => p.riskLevel === 'LOW').length;

    const avgGpa        = total > 0 ? profiles.reduce((s, p) => s + p.gpa, 0) / total : 0;
    const avgAttendance = total > 0 ? profiles.reduce((s, p) => s + p.attendanceRate, 0) / total : 0;

    // Eng ko'p triggered rule'lar
    const triggeredCounts = {
      attendance: profiles.filter(p => p.ruleBreakdown.attendance.triggered).length,
      gpa:        profiles.filter(p => p.ruleBreakdown.gpa.triggered).length,
      gpaDrop:    profiles.filter(p => p.ruleBreakdown.gpaDrop.triggered).length,
      payment:    profiles.filter(p => p.ruleBreakdown.payment.triggered).length,
      discipline: profiles.filter(p => p.ruleBreakdown.discipline.triggered).length,
      homework:   profiles.filter(p => p.ruleBreakdown.homework.triggered).length,
    };

    // Phase 2: alert aggregation
    const totalAlerts         = profiles.reduce((s, p) => s + p.alertCount,         0);
    const totalCriticalAlerts = profiles.reduce((s, p) => s + p.criticalAlertCount, 0);
    const alertsByType = {
      attendance_decline: profiles.reduce((s, p) => s + p.trendAlerts.filter(a => a.type === 'attendance_decline').length, 0),
      gpa_decline:        profiles.reduce((s, p) => s + p.trendAlerts.filter(a => a.type === 'gpa_decline').length,        0),
      homework_decline:   profiles.reduce((s, p) => s + p.trendAlerts.filter(a => a.type === 'homework_decline').length,   0),
      payment_risk:       profiles.reduce((s, p) => s + p.trendAlerts.filter(a => a.type === 'payment_risk').length,       0),
      discipline_spike:   profiles.reduce((s, p) => s + p.trendAlerts.filter(a => a.type === 'discipline_spike').length,   0),
    };

    return {
      totalStudents:    total,
      riskDistribution: { critical, high, medium, low },
      averages:         {
        gpa:        Math.round(avgGpa * 10) / 10,
        attendance: Math.round(avgAttendance * 10) / 10,
      },
      triggeredCounts,
      alertSummary: {
        totalAlerts,
        totalCriticalAlerts,
        alertsByType,
      },
      topAtRisk: profiles.slice(0, 10),
    };
  }
}
