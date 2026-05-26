-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExportEntity" ADD VALUE 'classes';
ALTER TYPE "ExportEntity" ADD VALUE 'subjects';
ALTER TYPE "ExportEntity" ADD VALUE 'rooms';
ALTER TYPE "ExportEntity" ADD VALUE 'attendance';
ALTER TYPE "ExportEntity" ADD VALUE 'teacher_attendance';
ALTER TYPE "ExportEntity" ADD VALUE 'substitutions';
ALTER TYPE "ExportEntity" ADD VALUE 'leave_requests';
ALTER TYPE "ExportEntity" ADD VALUE 'workload_report';
ALTER TYPE "ExportEntity" ADD VALUE 'timetable_analytics';
