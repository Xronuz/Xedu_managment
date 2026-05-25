-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('draft', 'validated', 'published', 'archived');

-- CreateEnum
CREATE TYPE "WeekType" AS ENUM ('all', 'numerator', 'denominator');

-- DropIndex
DROP INDEX "schedules_schoolId_branchId_idx";

-- AlterTable
ALTER TABLE "schedules" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "publishedBy" TEXT,
ADD COLUMN     "status" "ScheduleStatus" NOT NULL DEFAULT 'draft',
ADD COLUMN     "versionNote" TEXT,
ADD COLUMN     "weekType" "WeekType" NOT NULL DEFAULT 'all';

-- Backfill existing schedules as published to avoid blank dashboards
UPDATE "schedules" SET "status" = 'published', "publishedAt" = "createdAt";  

-- CreateIndex
CREATE INDEX "schedules_schoolId_branchId_status_idx" ON "schedules"("schoolId", "branchId", "status");

-- CreateIndex
CREATE INDEX "schedules_schoolId_branchId_weekType_idx" ON "schedules"("schoolId", "branchId", "weekType");

-- CreateIndex
CREATE INDEX "schedules_schoolId_status_weekType_idx" ON "schedules"("schoolId", "status", "weekType");

-- CreateIndex
CREATE INDEX "schedules_teacherId_dayOfWeek_status_idx" ON "schedules"("teacherId", "dayOfWeek", "status");

-- CreateIndex
CREATE INDEX "schedules_classId_dayOfWeek_status_idx" ON "schedules"("classId", "dayOfWeek", "status");

-- CreateIndex
CREATE INDEX "schedules_roomId_dayOfWeek_status_idx" ON "schedules"("roomId", "dayOfWeek", "status");
