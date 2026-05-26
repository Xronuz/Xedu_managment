-- CreateEnum
CREATE TYPE "ExportEntity" AS ENUM ('schedules', 'teaching_loads', 'payroll', 'users', 'analytics_summary');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('csv', 'xlsx', 'json');

-- CreateEnum
CREATE TYPE "ExportJobStatus" AS ENUM ('queued', 'processing', 'completed', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "branchId" TEXT,
    "createdBy" TEXT NOT NULL,
    "entity" "ExportEntity" NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "status" "ExportJobStatus" NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "fileUrl" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "export_jobs_schoolId_status_idx" ON "export_jobs"("schoolId", "status");

-- CreateIndex
CREATE INDEX "export_jobs_schoolId_createdAt_idx" ON "export_jobs"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "export_jobs_createdBy_idx" ON "export_jobs"("createdBy");

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
