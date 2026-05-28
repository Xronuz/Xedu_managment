import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import { getTelemetrySnapshot, TelemetrySnapshot } from './pilot-telemetry';

/**
 * PilotTelemetryPersistenceService
 *
 * Persists in-memory telemetry counters to the database once per day.
 * Resets counters after successful persistence so each day's counts
 * reflect only that day's activity.
 *
 * Uses @nestjs/schedule Interval as a lightweight trigger.
 * No external cron, no analytics vendors.
 */

@Injectable()
export class PilotTelemetryPersistenceService {
  private readonly logger = new Logger(PilotTelemetryPersistenceService.name);
  private lastPersistedDate = '';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check every 5 minutes if the day has rolled over.
   * If so, persist yesterday's counters and reset.
   */
  @Interval(5 * 60 * 1000) // 5 minutes
  async maybePersist(): Promise<void> {
    const today = this.dateKey(new Date());
    if (this.lastPersistedDate === today) {
      return; // Already persisted for today
    }

    const snapshot = getTelemetrySnapshot();

    try {
      await this.prisma.pilotTelemetrySnapshot.upsert({
        where: { date: this.startOfDay(new Date()) },
        update: this.snapshotToRecord(snapshot),
        create: {
          date: this.startOfDay(new Date()),
          ...this.snapshotToRecord(snapshot),
        },
      });

      this.lastPersistedDate = today;
      this.logger.log(`Pilot telemetry persisted for ${today}: logins=${snapshot.loginCount}, exports=${snapshot.exportJobCount}, errors500=${snapshot.error500Count}`);
    } catch (err: any) {
      this.logger.error(`Failed to persist pilot telemetry: ${err.message}`);
    }
  }

  /**
   * Force-persist current counters immediately.
   * Used for graceful shutdown or manual trigger.
   */
  async persistNow(): Promise<void> {
    const snapshot = getTelemetrySnapshot();
    const today = this.startOfDay(new Date());
    await this.prisma.pilotTelemetrySnapshot.upsert({
      where: { date: today },
      update: this.snapshotToRecord(snapshot),
      create: { date: today, ...this.snapshotToRecord(snapshot) },
    });
    this.lastPersistedDate = this.dateKey(new Date());
    this.logger.log(`Pilot telemetry force-persisted for ${this.lastPersistedDate}`);
  }

  /**
   * Fetch snapshots for a date range.
   */
  async fetchRange(start: Date, end: Date) {
    return this.prisma.pilotTelemetrySnapshot.findMany({
      where: { date: { gte: this.startOfDay(start), lte: this.startOfDay(end) } },
      orderBy: { date: 'asc' },
    });
  }

  /**
   * Fetch the most recent N days.
   */
  async fetchRecent(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    start.setHours(0, 0, 0, 0);
    return this.fetchRange(start, end);
  }

  private snapshotToRecord(s: TelemetrySnapshot) {
    return {
      logins: s.loginCount,
      setupCompletions: s.setupCompletionCount,
      scheduleGenerations: s.scheduleGenerationCount,
      solverRuns: s.solverRunCount,
      exports: s.exportJobCount,
      attendanceActions: s.attendanceActionCount,
      gradePublishes: s.gradePublishCount,
      homeworkSubmissions: s.homeworkSubmissionCount,
      examSubmissions: s.examSubmissionCount,
      coinTransactions: s.coinTransactionCount,
      announcementReads: s.announcementReadCount,
      invitationAccepts: s.invitationAcceptCount,
      queueFailures: s.queueFailureCount,
      error500s: s.error500Count,
    };
  }

  private dateKey(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private startOfDay(d: Date): Date {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }
}
