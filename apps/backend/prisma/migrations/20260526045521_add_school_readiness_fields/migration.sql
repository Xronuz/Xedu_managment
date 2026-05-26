-- CreateEnum
CREATE TYPE "SolverRunStatus" AS ENUM ('running', 'completed', 'failed', 'cancelled');

-- AlterTable
ALTER TABLE "payroll_items" ADD COLUMN     "completedHoursCalculatedAt" TIMESTAMP(3),
ADD COLUMN     "completedHoursOverrideReason" TEXT,
ADD COLUMN     "completedHoursSource" TEXT;

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "lastTimetablePublishAt" TIMESTAMP(3),
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "readinessScore" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "teacher_attendances" ADD COLUMN     "leaveRequestId" TEXT,
ADD COLUMN     "substitutionId" TEXT;

-- AlterTable
ALTER TABLE "teacher_substitutions" ADD COLUMN     "leaveRequestId" TEXT;

-- CreateTable
CREATE TABLE "solver_runs" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "branchId" TEXT,
    "weekType" "WeekType" NOT NULL DEFAULT 'all',
    "strategy" TEXT NOT NULL DEFAULT 'hybrid',
    "status" "SolverRunStatus" NOT NULL DEFAULT 'running',
    "demandsCount" INTEGER NOT NULL,
    "placedCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "solver_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solver_runs_schoolId_status_idx" ON "solver_runs"("schoolId", "status");

-- CreateIndex
CREATE INDEX "solver_runs_schoolId_createdAt_idx" ON "solver_runs"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "teacher_attendances_leaveRequestId_idx" ON "teacher_attendances"("leaveRequestId");

-- CreateIndex
CREATE INDEX "teacher_attendances_substitutionId_idx" ON "teacher_attendances"("substitutionId");

-- CreateIndex
CREATE INDEX "teacher_substitutions_leaveRequestId_idx" ON "teacher_substitutions"("leaveRequestId");

-- AddForeignKey
ALTER TABLE "teacher_attendances" ADD CONSTRAINT "teacher_attendances_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "leave_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_attendances" ADD CONSTRAINT "teacher_attendances_substitutionId_fkey" FOREIGN KEY ("substitutionId") REFERENCES "teacher_substitutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_substitutions" ADD CONSTRAINT "teacher_substitutions_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "leave_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solver_runs" ADD CONSTRAINT "solver_runs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
