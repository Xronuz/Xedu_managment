import {
  Injectable, Logger, NotFoundException, ForbiddenException,
  BadRequestException, ConflictException, Optional,
} from '@nestjs/common';
import {
  IsString, IsNumber, IsOptional, IsBoolean, IsArray,
  IsIn, Min, Max, MinLength, MaxLength,
} from 'class-validator';
import * as mammoth from 'mammoth';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EventsGateway } from '@/modules/gateway/events.gateway';
import { AuditService } from '@/common/audit/audit.service';
import { ExamEngagementService } from '@/modules/engagement/exam-engagement.service';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export class CreateQuestionDto {
  @IsIn(['multiple_choice', 'true_false', 'short_answer', 'essay'])
  type: string;

  @IsString() @MinLength(3) @MaxLength(2000)
  text: string;

  @IsOptional() @IsNumber() @Min(0.5) @Max(100)
  points?: number;

  @IsOptional() @IsNumber() @Min(0)
  order?: number;

  @IsOptional() @IsString()
  explanation?: string;

  @IsOptional() @IsArray()
  options?: CreateOptionDto[];
}

export class CreateOptionDto {
  @IsString() @MinLength(1) @MaxLength(500)
  text: string;

  @IsOptional() @IsBoolean()
  isCorrect?: boolean;

  @IsOptional() @IsNumber() @Min(0)
  order?: number;
}

export class UpdateQuestionDto {
  @IsOptional() @IsString() @MinLength(3)
  text?: string;

  @IsOptional() @IsNumber() @Min(0.5)
  points?: number;

  @IsOptional() @IsNumber() @Min(0)
  order?: number;

  @IsOptional() @IsString()
  explanation?: string;
}

export class StartSessionDto {
  // Hech qanday maydon talab qilinmaydi — studentId JWT'dan olinadi
}

export class SubmitAnswerDto {
  @IsString()
  questionId: string;

  @IsOptional() @IsString()
  selectedOptionId?: string;

  @IsOptional() @IsString() @MaxLength(5000)
  textAnswer?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

const TEACHER_ROLES = [
  UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL,
];

@Injectable()
export class OnlineExamService {
  private readonly logger = new Logger(OnlineExamService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly eventsGateway: EventsGateway,
    @Optional() private readonly auditService: AuditService,
    @Optional() private readonly examEngagementService: ExamEngagementService,
  ) {}

  // ─── Question Management ──────────────────────────────────────────────────

  async getQuestions(examId: string, currentUser: JwtPayload) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, ...buildTenantWhere(currentUser) },
    });
    if (!exam) throw new NotFoundException('Imtihon topilmadi');

    return this.prisma.examQuestion.findMany({
      where: { examId },
      include: { options: { orderBy: { order: 'asc' } } },
      orderBy: { order: 'asc' },
    });
  }

  async addQuestion(examId: string, dto: CreateQuestionDto, currentUser: JwtPayload) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, ...buildTenantWhere(currentUser) },
    });
    if (!exam) throw new NotFoundException('Imtihon topilmadi');
    if (!TEACHER_ROLES.includes(currentUser.role as any)) {
      throw new ForbiddenException("Savol qo'shish huquqi yo'q");
    }

    // Order: mavjud savollar oxiriga qo'shish
    const lastOrder = await this.prisma.examQuestion.aggregate({
      where: { examId },
      _max: { order: true },
    });
    const order = dto.order ?? (lastOrder._max.order ?? 0) + 1;

    const question = await this.prisma.examQuestion.create({
      data: {
        examId,
        type:   dto.type as any,
        text:   dto.text,
        points: dto.points ?? 1,
        order,
        explanation: dto.explanation,
        options: dto.options?.length
          ? {
              create: dto.options.map((o, i) => ({
                text:      o.text,
                isCorrect: o.isCorrect ?? false,
                order:     o.order ?? i,
              })),
            }
          : undefined,
      },
      include: { options: { orderBy: { order: 'asc' } } },
    });
    return question;
  }

  async updateQuestion(qId: string, dto: UpdateQuestionDto, currentUser: JwtPayload) {
    const q = await this.prisma.examQuestion.findFirst({
      where: { id: qId, exam: { ...buildTenantWhere(currentUser) } },
    });
    if (!q) throw new NotFoundException('Savol topilmadi');
    if (!TEACHER_ROLES.includes(currentUser.role as any)) {
      throw new ForbiddenException("Savol tahrirlash huquqi yo'q");
    }
    return this.prisma.examQuestion.update({ where: { id: qId }, data: dto });
  }

  async deleteQuestion(qId: string, currentUser: JwtPayload) {
    const q = await this.prisma.examQuestion.findFirst({
      where: { id: qId, exam: { ...buildTenantWhere(currentUser) } },
    });
    if (!q) throw new NotFoundException('Savol topilmadi');
    if (!TEACHER_ROLES.includes(currentUser.role as any)) {
      throw new ForbiddenException("Savol o'chirish huquqi yo'q");
    }
    await this.prisma.examQuestion.delete({ where: { id: qId } });
    return { message: 'Savol o‘chirildi' };
  }

  // ─── DocX Import ──────────────────────────────────────────────────────────

  /**
   * Word hujjatidan savollarni avtomatik ajratib olish
   *
   * Format (qo'llab-quvvatlanadigan):
   * 1. Savol matni?
   * A) Variant 1
   * B) Variant 2
   * C) Variant 3 *       <- * belgisi to'g'ri javobni bildiradi
   * D) Variant 4
   *
   * To'g'ri / Noto'g'ri:
   * 2. Bu jumla to'g'rimi? [to'g'ri]
   */
  async importFromDocx(
    examId: string,
    buffer: Buffer,
    currentUser: JwtPayload,
  ) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, ...buildTenantWhere(currentUser) },
    });
    if (!exam) throw new NotFoundException('Imtihon topilmadi');
    if (!TEACHER_ROLES.includes(currentUser.role as any)) {
      throw new ForbiddenException("DocX import huquqi yo'q");
    }

    // DocX → raw text
    const result = await mammoth.extractRawText({ buffer });
    const rawText = result.value;

    const questions = this.parseDocxQuestions(rawText);
    if (questions.length === 0) {
      throw new BadRequestException(
        "Hujjatdan savollar topilmadi. Format: '1. Savol?' keyin A) B) C) D) variantlar",
      );
    }

    // Bazaga saqlash
    const lastOrder = await this.prisma.examQuestion.aggregate({
      where: { examId },
      _max: { order: true },
    });
    let order = (lastOrder._max.order ?? 0) + 1;

    const created: any[] = [];
    for (const q of questions) {
      const question = await this.prisma.examQuestion.create({
        data: {
          examId,
          type:    q.type as any,
          text:    q.text,
          points:  1,
          order:   order++,
          options: q.options?.length
            ? {
                create: q.options.map((o: any, i: number) => ({
                  text:      o.text,
                  isCorrect: o.isCorrect,
                  order:     i,
                })),
              }
            : undefined,
        },
        include: { options: true },
      });
      created.push(question);
    }

    return { imported: created.length, questions: created };
  }

  private parseDocxQuestions(text: string) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const questions: any[] = [];
    let current: any = null;

    const questionRe = /^(\d+)[.)]\s+(.+)/;
    const optionRe   = /^([A-D])[.)]\s+(.+)/i;
    const tfRe       = /\[(to'g'ri|noto'g'ri|true|false|ha|yo'q)\]/i;

    for (const line of lines) {
      // Yangi savol
      const qm = line.match(questionRe);
      if (qm) {
        if (current) questions.push(current);
        const text = qm[2];

        // To'g'ri/noto'g'ri savol?
        if (tfRe.test(text)) {
          const match = text.match(tfRe);
          const correct = /to'g'ri|true|ha/i.test(match![1]);
          current = {
            type: 'true_false',
            text: text.replace(tfRe, '').trim(),
            options: [
              { text: "To'g'ri",   isCorrect: correct },
              { text: "Noto'g'ri", isCorrect: !correct },
            ],
          };
        } else {
          current = { type: 'multiple_choice', text, options: [] };
        }
        continue;
      }

      // Variant
      if (current?.type === 'multiple_choice') {
        const om = line.match(optionRe);
        if (om) {
          const raw = om[2];
          const isCorrect = raw.endsWith('*');
          current.options.push({
            text:      isCorrect ? raw.slice(0, -1).trim() : raw.trim(),
            isCorrect,
          });
          continue;
        }
      }
    }
    if (current) questions.push(current);

    return questions;
  }

  // ─── Exam Sessions ────────────────────────────────────────────────────────

  async startSession(examId: string, currentUser: JwtPayload) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, schoolId: currentUser.schoolId!, isPublished: true },
      include: { questions: { include: { options: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } } },
    });
    if (!exam) throw new NotFoundException('Imtihon topilmadi yoki nashr qilinmagan');
    if (!exam.questions.length) throw new BadRequestException('Imtihonda savollar yo‘q');

    // ── Time-window enforcement ───────────────────────────────────────────────
    const now = new Date();
    if (exam.scheduledAt) {
      const startTime = new Date(exam.scheduledAt);
      if (now < startTime) {
        throw new ForbiddenException('Imtihon hali boshlanmagan');
      }
      if (exam.duration) {
        const endTime = new Date(startTime.getTime() + exam.duration * 60000);
        if (now > endTime) {
          throw new ForbiddenException('Imtihon muddati tugagan');
        }
      }
    }

    // Avvalgi session bor?
    const existing = await this.prisma.examSession.findUnique({
      where: { examId_studentId: { examId, studentId: currentUser.sub } },
    });
    if (existing) {
      if (existing.status === 'submitted' || existing.status === 'graded') {
        throw new ConflictException('Siz bu imtihonni allaqachon topshirgansiz');
      }
      // in_progress: davom ettirish
      return {
        session: existing,
        questions: exam.questions.map(q => ({
          id: q.id, type: q.type, text: q.text, points: q.points, order: q.order,
          options: q.options.map(o => ({ id: o.id, text: o.text, order: o.order })),
          // isCorrect ko'rsatilmaydi
        })),
        exam: {
          id: exam.id, title: exam.title, duration: exam.duration,
          maxScore: exam.maxScore, scheduledAt: exam.scheduledAt,
        },
      };
    }

    // Yangi session
    const session = await this.prisma.examSession.create({
      data: {
        examId,
        studentId: currentUser.sub,
        schoolId:  currentUser.schoolId!,
        status:    'in_progress',
      },
    });

    // Real-time: teacher'ga bildiruv
    this.eventsGateway?.emitToSchool(currentUser.schoolId!, 'exam:session:started', {
      examId,
      sessionId: session.id,
      studentId: currentUser.sub,
    });

    return {
      session,
      questions: exam.questions.map(q => ({
        id: q.id, type: q.type, text: q.text, points: q.points, order: q.order,
        options: q.options.map(o => ({ id: o.id, text: o.text, order: o.order })),
      })),
      exam: {
        id: exam.id, title: exam.title, duration: exam.duration,
        maxScore: exam.maxScore, scheduledAt: exam.scheduledAt,
      },
    };
  }

  async saveAnswer(sessionId: string, dto: SubmitAnswerDto, currentUser: JwtPayload) {
    const session = await this.prisma.examSession.findFirst({
      where: { id: sessionId, studentId: currentUser.sub },
    });
    if (!session) throw new NotFoundException('Sessiya topilmadi');
    if (session.status !== 'in_progress') {
      throw new BadRequestException('Imtihon topshirilgan, javob o‘zgartirish mumkin emas');
    }

    // ── Validate selectedOptionId belongs to the question ─────────────────────
    if (dto.selectedOptionId) {
      const option = await this.prisma.examOption.findFirst({
        where: { id: dto.selectedOptionId, questionId: dto.questionId },
      });
      if (!option) {
        throw new BadRequestException('Variant bu savolga tegishli emas');
      }
    }

    return this.prisma.studentAnswer.upsert({
      where: { sessionId_questionId: { sessionId, questionId: dto.questionId } },
      create: {
        sessionId,
        questionId:      dto.questionId,
        selectedOptionId: dto.selectedOptionId,
        textAnswer:      dto.textAnswer,
        pointsEarned:    0,
      },
      update: {
        selectedOptionId: dto.selectedOptionId,
        textAnswer:       dto.textAnswer,
      },
    });
  }

  async submitSession(sessionId: string, currentUser: JwtPayload) {
    const session = await this.prisma.examSession.findFirst({
      where: { id: sessionId, studentId: currentUser.sub },
      include: {
        answers:  true,
        exam: {
          include: {
            questions: { include: { options: true } },
          },
        },
      },
    });
    if (!session) throw new NotFoundException('Sessiya topilmadi');
    if (session.status !== 'in_progress') throw new BadRequestException('Imtihon allaqachon topshirilgan');

    // Auto-grading: multiple_choice va true_false
    let totalScore = 0;
    let totalPossible = 0;
    const answerUpdates: { id: string; isCorrect: boolean; pointsEarned: number }[] = [];

    for (const q of session.exam.questions) {
      totalPossible += q.points;
      const answer = session.answers.find(a => a.questionId === q.id);
      if (!answer) continue;

      if (q.type === 'multiple_choice' || q.type === 'true_false') {
        const correctOption = q.options.find(o => o.isCorrect);
        const isCorrect = correctOption?.id === answer.selectedOptionId;
        const earned = isCorrect ? q.points : 0;
        totalScore += earned;
        answerUpdates.push({ id: answer.id, isCorrect, pointsEarned: earned });
      }
      // short_answer va essay → teacher qo'lda tekshiradi
    }

    const percentage = totalPossible > 0
      ? Math.round((totalScore / totalPossible) * 100 * 10) / 10
      : 0;

    // ── Atomic transaction: answers + session + grade bridge ──────────────────
    const exam = session.exam;
    const [updated] = await this.prisma.$transaction([
      this.prisma.examSession.update({
        where: { id: sessionId },
        data: {
          status:      'submitted',
          submittedAt: new Date(),
          score:       totalScore,
          percentage,
        },
      }),
      ...answerUpdates.map(u =>
        this.prisma.studentAnswer.update({
          where: { id: u.id },
          data: { isCorrect: u.isCorrect, pointsEarned: u.pointsEarned },
        }),
      ),
    ]);

    // ── Grade bridge: upsert linked Grade record (outside tx for idempotency) ─
    const existingGrade = await this.prisma.grade.findFirst({
      where: { examId: exam.id, studentId: currentUser.sub, deletedAt: null },
    });
    const gradePayload = {
      schoolId: exam.schoolId,
      branchId: exam.branchId,
      classId: exam.classId,
      studentId: currentUser.sub,
      subjectId: exam.subjectId,
      type: 'exam' as any,
      score: totalScore,
      maxScore: exam.maxScore ?? 100,
      date: new Date(exam.scheduledAt ?? new Date()),
      comment: `Online exam: ${exam.title}`,
      examId: exam.id,
      source: 'exam',
      isPublished: true,
      createdById: currentUser.sub,
    };
    if (existingGrade) {
      await this.prisma.grade.update({
        where: { id: existingGrade.id },
        data: {
          score: totalScore,
          maxScore: exam.maxScore ?? 100,
          date: new Date(exam.scheduledAt ?? new Date()),
          comment: `Online exam: ${exam.title}`,
        },
      });
    } else {
      await this.prisma.grade.create({ data: gradePayload });
    }

    // Real-time: teacher dashboard
    this.eventsGateway?.emitToSchool(session.schoolId, 'exam:session:submitted', {
      examId:    session.examId,
      sessionId: session.id,
      studentId: currentUser.sub,
      score:     totalScore,
      percentage,
    });

    // ── Engagement: evaluate exam result for coins/achievements ───────────────
    if (this.examEngagementService) {
      // Idempotency: skip if already evaluated for this session
      const alreadyEvaluated = await this.prisma.coinTransaction.findFirst({
        where: {
          userId: currentUser.sub,
          schoolId: session.schoolId,
          metadata: { path: ['sessionId'], equals: session.id },
        },
      }).catch(() => null);

      if (!alreadyEvaluated) {
        this.examEngagementService.evaluateExamResult({
          studentId: currentUser.sub,
          schoolId: session.schoolId,
          examId: session.examId,
          score: totalScore,
          maxScore: totalPossible,
          triggeredBy: currentUser.sub,
          sessionId: session.id,
        }).catch((err) => this.logger.error(`Imtihon engagement baholanmadi (sessionId=${session.id})`, err?.stack ?? err));
      }
    }

    return {
      session: updated,
      score:   totalScore,
      total:   totalPossible,
      percentage,
      message: 'Imtihon muvaffaqiyatli topshirildi!',
    };
  }

  async getSessionResult(sessionId: string, currentUser: JwtPayload) {
    const isTeacher = TEACHER_ROLES.includes(currentUser.role as any);

    const session = await this.prisma.examSession.findFirst({
      where: {
        id: sessionId,
        ...(!isTeacher ? { studentId: currentUser.sub } : { schoolId: currentUser.schoolId! }),
      },
      include: {
        answers: {
          include: {
            question: { include: { options: true } },
            selectedOption: true,
          },
        },
        student: { select: { id: true, firstName: true, lastName: true } },
        exam:    { select: { id: true, title: true, maxScore: true } },
      },
    });
    if (!session) throw new NotFoundException('Natija topilmadi');

    // ── Strip correct answers for non-teachers ────────────────────────────────
    if (!isTeacher) {
      return {
        ...session,
        answers: session.answers.map(a => ({
          ...a,
          question: {
            ...a.question,
            options: a.question.options.map(o => ({
              id: o.id,
              text: o.text,
              order: o.order,
              // isCorrect intentionally omitted
            })),
          },
        })),
      } as any;
    }

    return session;
  }

  async getExamSessions(examId: string, currentUser: JwtPayload) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, ...buildTenantWhere(currentUser) },
    });
    if (!exam) throw new NotFoundException('Imtihon topilmadi');

    return this.prisma.examSession.findMany({
      where: { examId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ status: 'asc' }, { submittedAt: 'asc' }],
    });
  }
}
