/**
 * Pilot Telemetry — Lightweight operational counters
 * No external analytics vendors. In-memory only (per-process).
 * Resets on deploy. Suitable for pilot usage snapshot, not long-term analytics.
 */

export interface TelemetrySnapshot {
  loginCount: number;
  setupCompletionCount: number;
  scheduleGenerationCount: number;
  solverRunCount: number;
  exportJobCount: number;
  attendanceActionCount: number;
  gradePublishCount: number;
  homeworkSubmissionCount: number;
  examSubmissionCount: number;
  coinTransactionCount: number;
  announcementReadCount: number;
  invitationAcceptCount: number;
  queueFailureCount: number;
  error500Count: number;
}

// ─── Counters ───────────────────────────────────────────────────────────────

let loginCount = 0;
let setupCompletionCount = 0;
let scheduleGenerationCount = 0;
let solverRunCount = 0;
let exportJobCount = 0;
let attendanceActionCount = 0;
let gradePublishCount = 0;
let homeworkSubmissionCount = 0;
let examSubmissionCount = 0;
let coinTransactionCount = 0;
let announcementReadCount = 0;
let invitationAcceptCount = 0;
let queueFailureCount = 0;
let error500Count = 0;

// ─── Increment functions ────────────────────────────────────────────────────

export function recordLogin() { loginCount++; }
export function recordSetupComplete() { setupCompletionCount++; }
export function recordScheduleGeneration() { scheduleGenerationCount++; }
export function recordSolverRun() { solverRunCount++; }
export function recordExportJob() { exportJobCount++; }
export function recordAttendanceAction() { attendanceActionCount++; }
export function recordGradePublish() { gradePublishCount++; }
export function recordHomeworkSubmission() { homeworkSubmissionCount++; }
export function recordExamSubmission() { examSubmissionCount++; }
export function recordCoinTransaction() { coinTransactionCount++; }
export function recordAnnouncementRead() { announcementReadCount++; }
export function recordInvitationAccept() { invitationAcceptCount++; }
export function recordQueueFailure() { queueFailureCount++; }
export function recordError500() { error500Count++; }

// ─── Snapshot ───────────────────────────────────────────────────────────────

export function getTelemetrySnapshot(): TelemetrySnapshot {
  return {
    loginCount,
    setupCompletionCount,
    scheduleGenerationCount,
    solverRunCount,
    exportJobCount,
    attendanceActionCount,
    gradePublishCount,
    homeworkSubmissionCount,
    examSubmissionCount,
    coinTransactionCount,
    announcementReadCount,
    invitationAcceptCount,
    queueFailureCount,
    error500Count,
  };
}

// ─── Reset (for testing only) ───────────────────────────────────────────────

export function resetTelemetry(): void {
  loginCount = 0;
  setupCompletionCount = 0;
  scheduleGenerationCount = 0;
  solverRunCount = 0;
  exportJobCount = 0;
  attendanceActionCount = 0;
  gradePublishCount = 0;
  homeworkSubmissionCount = 0;
  examSubmissionCount = 0;
  coinTransactionCount = 0;
  announcementReadCount = 0;
  invitationAcceptCount = 0;
  queueFailureCount = 0;
  error500Count = 0;
}
