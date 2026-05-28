import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface WorkflowFunnel {
  name: string;
  stages: Array<{ label: string; count: number; dropOff?: number }>;
  healthy: boolean;
  note?: string;
}

export interface FrictionSignal {
  signal: string;
  severity: 'high' | 'medium' | 'low';
  count: number;
  module: string;
  note: string;
}

export interface RoleActivity {
  role: string;
  activeUsers: number;
  totalUsers: number;
  topActions: Array<{ action: string; count: number }>;
}

@Injectable()
export class PilotEvidenceService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Workflow Funnels ───────────────────────────────────────────────────

  async getSetupFunnel(): Promise<WorkflowFunnel> {
    const [totalSchools, onboarded, withClasses, withSchedule, withAttendance] = await Promise.all([
      this.prisma.school.count(),
      this.prisma.school.count({ where: { onboardingCompleted: true } }),
      this.prisma.school.count({ where: { classes: { some: {} } } }),
      this.prisma.school.count({ where: { schedules: { some: {} } } }),
      this.prisma.school.count({ where: { attendance: { some: {} } } }),
    ]);

    const stages = [
      { label: 'School created', count: totalSchools },
      { label: 'Onboarding completed', count: onboarded, dropOff: this.dropOff(totalSchools, onboarded) },
      { label: 'Has classes', count: withClasses, dropOff: this.dropOff(onboarded, withClasses) },
      { label: 'Has schedule', count: withSchedule, dropOff: this.dropOff(withClasses, withSchedule) },
      { label: 'Marked attendance', count: withAttendance, dropOff: this.dropOff(withSchedule, withAttendance) },
    ];

    return {
      name: 'Setup Wizard Completion Chain',
      stages,
      healthy: stages.every(s => (s.dropOff ?? 0) < 50),
      note: stages.some(s => (s.dropOff ?? 0) > 50) ? 'Significant drop-off detected in setup funnel' : undefined,
    };
  }

  async getScheduleFunnel(): Promise<WorkflowFunnel> {
    const [generated, published, conflicts] = await Promise.all([
      this.prisma.solverRun.count(),
      this.prisma.schedule.count({ where: { status: 'published' } }),
      this.prisma.schedule.count({ where: { status: 'draft' } }),
    ]);

    const stages = [
      { label: 'Solver runs', count: generated },
      { label: 'Published schedules', count: published, dropOff: this.dropOff(generated, published) },
      { label: 'Draft schedules', count: conflicts },
    ];

    return {
      name: 'Schedule Generation → Publish',
      stages,
      healthy: published > 0 && (conflicts / Math.max(published + conflicts, 1)) < 0.5,
      note: conflicts > published ? 'More draft schedules than published — possible publish friction' : undefined,
    };
  }

  async getHomeworkFunnel(): Promise<WorkflowFunnel> {
    const [created, submissions, graded] = await Promise.all([
      this.prisma.homework.count(),
      this.prisma.homeworkSubmission.count(),
      this.prisma.homeworkSubmission.count({ where: { score: { not: null } } }),
    ]);

    const stages = [
      { label: 'Homework created', count: created },
      { label: 'Submissions', count: submissions, dropOff: this.dropOff(created, submissions) },
      { label: 'Graded', count: graded, dropOff: this.dropOff(submissions, graded) },
    ];

    return {
      name: 'Homework Create → Submit → Grade',
      stages,
      healthy: graded > 0 && stages.every(s => (s.dropOff ?? 0) < 70),
      note: stages.some(s => (s.dropOff ?? 0) > 70) ? 'Severe drop-off in homework chain' : undefined,
    };
  }

  async getExamFunnel(): Promise<WorkflowFunnel> {
    const [created, sessions, graded] = await Promise.all([
      this.prisma.exam.count(),
      this.prisma.examSession.count(),
      this.prisma.examSession.count({ where: { score: { not: null } } }),
    ]);

    const stages = [
      { label: 'Exams created', count: created },
      { label: 'Sessions started', count: sessions, dropOff: this.dropOff(created, sessions) },
      { label: 'Graded', count: graded, dropOff: this.dropOff(sessions, graded) },
    ];

    return {
      name: 'Exam Create → Attempt → Grade',
      stages,
      healthy: graded > 0 && stages.every(s => (s.dropOff ?? 0) < 70),
      note: stages.some(s => (s.dropOff ?? 0) > 70) ? 'Severe drop-off in exam chain' : undefined,
    };
  }

  async getExportFunnel(): Promise<WorkflowFunnel> {
    const [created, completed, failed] = await Promise.all([
      this.prisma.exportJob.count(),
      this.prisma.exportJob.count({ where: { status: 'completed' } }),
      this.prisma.exportJob.count({ where: { status: 'failed' } }),
    ]);

    const successRate = created > 0 ? Math.round((completed / created) * 100) : 0;

    return {
      name: 'Export Lifecycle',
      stages: [
        { label: 'Created', count: created },
        { label: 'Completed', count: completed },
        { label: 'Failed', count: failed },
      ],
      healthy: successRate >= 80,
      note: successRate < 80 ? `Export success rate is ${successRate}% — investigate failures` : undefined,
    };
  }

  async getAnnouncementFunnel(): Promise<WorkflowFunnel> {
    const [sent, read] = await Promise.all([
      this.prisma.announcement.count(),
      this.prisma.announcementReceipt.count({ where: { readAt: { not: null } } }),
    ]);

    return {
      name: 'Announcement Send → Read',
      stages: [
        { label: 'Sent', count: sent },
        { label: 'Read', count: read, dropOff: this.dropOff(sent, read) },
      ],
      healthy: sent > 0 && (read / Math.max(sent, 1)) > 0.3,
      note: sent > 0 && read / Math.max(sent, 1) < 0.3 ? 'Low read rate on announcements' : undefined,
    };
  }

  async getInvitationFunnel(): Promise<WorkflowFunnel> {
    const [sent, accepted] = await Promise.all([
      this.prisma.invitation.count(),
      this.prisma.invitation.count({ where: { status: 'ACCEPTED' } }),
    ]);

    return {
      name: 'Invitation Send → Accept',
      stages: [
        { label: 'Sent', count: sent },
        { label: 'Accepted', count: accepted, dropOff: this.dropOff(sent, accepted) },
      ],
      healthy: sent > 0 && (accepted / Math.max(sent, 1)) > 0.5,
      note: sent > 0 && accepted / Math.max(sent, 1) < 0.5 ? 'Low invitation acceptance rate' : undefined,
    };
  }

  // ─── Friction Signals ───────────────────────────────────────────────────

  async getFrictionSignals(): Promise<FrictionSignal[]> {
    const signals: FrictionSignal[] = [];

    const [
      failedExports,
      failedSolvers,
      draftSchedules,
      draftGrades,
      unreadAnnouncements,
      ungradedSubmissions,
      abandonedHomework,
      highRetryLogins,
    ] = await Promise.all([
      this.prisma.exportJob.count({ where: { status: 'failed' } }),
      this.prisma.solverRun.count({ where: { status: 'cancelled' } }),
      this.prisma.schedule.count({ where: { status: 'draft' } }),
      this.prisma.grade.count({ where: { isPublished: false } }),
      this.prisma.announcementReceipt.count({ where: { readAt: null } }),
      this.prisma.homeworkSubmission.count({ where: { score: { equals: null } } }),
      this.prisma.homework.count({ where: { submissions: { none: {} } } }),
      this.prisma.auditLog.count({ where: { action: 'login', createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    ]);

    if (failedExports > 0) {
      signals.push({ signal: 'Failed exports', severity: failedExports > 5 ? 'high' : 'medium', count: failedExports, module: 'exports', note: 'Users may retry or abandon export workflow' });
    }
    if (failedSolvers > 0) {
      signals.push({ signal: 'Failed solver runs', severity: failedSolvers > 3 ? 'high' : 'medium', count: failedSolvers, module: 'schedule', note: 'Schedule generation may appear unreliable' });
    }
    if (draftSchedules > 5) {
      signals.push({ signal: 'Draft schedules never published', severity: 'medium', count: draftSchedules, module: 'schedule', note: 'Users generate but do not commit schedules' });
    }
    if (draftGrades > 10) {
      signals.push({ signal: 'Unpublished grades', severity: 'medium', count: draftGrades, module: 'grades', note: 'Teachers may forget or avoid publishing grades' });
    }
    if (unreadAnnouncements > 50) {
      signals.push({ signal: 'Unread announcements', severity: 'low', count: unreadAnnouncements, module: 'announcements', note: 'Recipients not engaging with announcements' });
    }
    if (ungradedSubmissions > 20) {
      signals.push({ signal: 'Ungraded submissions', severity: 'medium', count: ungradedSubmissions, module: 'homework', note: 'Grading backlog accumulating' });
    }
    if (abandonedHomework > 5) {
      signals.push({ signal: 'Homework with zero submissions', severity: 'low', count: abandonedHomework, module: 'homework', note: 'Students not submitting assigned work' });
    }

    return signals;
  }

  // ─── Role Activity ──────────────────────────────────────────────────────

  async getRoleActivity(since: Date): Promise<RoleActivity[]> {
    const roles = ['director', 'vice_principal', 'teacher', 'class_teacher', 'student', 'parent', 'accountant'];

    const results = await Promise.all(
      roles.map(async (role) => {
        const total = await this.prisma.user.count({ where: { role: role as any, isActive: true } });
        const active = await this.prisma.auditLog.groupBy({
          by: ['userId'],
          where: { user: { role: role as any }, createdAt: { gte: since } },
          _count: { userId: true },
        }).then(r => r.length);

        const topActions = await this.prisma.auditLog.groupBy({
          by: ['action'],
          where: { user: { role: role as any }, createdAt: { gte: since } },
          _count: { action: true },
          orderBy: { _count: { action: 'desc' } },
          take: 3,
        });

        return {
          role,
          activeUsers: active,
          totalUsers: total,
          topActions: topActions.map(a => ({ action: a.action, count: a._count.action })),
        };
      }),
    );

    return results;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private dropOff(from: number, to: number): number {
    if (from === 0) return 0;
    return Math.round(((from - to) / from) * 100);
  }
}
