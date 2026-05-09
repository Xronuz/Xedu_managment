/*
  Warnings:

  - The `status` column on the `course_enrollments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `type` column on the `course_materials` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `frequency` column on the `fee_structures` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `type` column on the `rooms` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `type` on the `coin_transactions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `reason` on the `coin_transactions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "CourseEnrollmentStatus" AS ENUM ('active', 'completed', 'dropped', 'suspended');

-- CreateEnum
CREATE TYPE "CourseMaterialType" AS ENUM ('document', 'video', 'link', 'pdf', 'audio');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('classroom', 'lab', 'hall', 'gym', 'other');

-- CreateEnum
CREATE TYPE "CoinTransactionType" AS ENUM ('earn', 'deduct');

-- CreateEnum
CREATE TYPE "CoinTransactionReason" AS ENUM ('grade_excellent', 'attendance_weekly', 'discipline_praise', 'manual_award', 'shop_purchase', 'discipline_warning', 'manual_deduct');

-- CreateEnum
CREATE TYPE "FeeFrequency" AS ENUM ('monthly', 'yearly', 'quarterly', 'weekly', 'one_time');

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'cancelled';

-- AlterTable
ALTER TABLE "attendance" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "branchId" TEXT;

-- AlterTable
ALTER TABLE "coin_transactions" DROP COLUMN "type",
ADD COLUMN     "type" "CoinTransactionType" NOT NULL,
DROP COLUMN "reason",
ADD COLUMN     "reason" "CoinTransactionReason" NOT NULL;

-- AlterTable
ALTER TABLE "course_enrollments" DROP COLUMN "status",
ADD COLUMN     "status" "CourseEnrollmentStatus" NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "course_materials" DROP COLUMN "type",
ADD COLUMN     "type" "CourseMaterialType" NOT NULL DEFAULT 'document';

-- AlterTable
ALTER TABLE "fee_structures" DROP COLUMN "frequency",
ADD COLUMN     "frequency" "FeeFrequency" NOT NULL DEFAULT 'monthly';

-- AlterTable
ALTER TABLE "grades" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "leave_requests" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "rooms" DROP COLUMN "type",
ADD COLUMN     "type" "RoomType" NOT NULL DEFAULT 'classroom';

-- AlterTable
ALTER TABLE "treasuries" ALTER COLUMN "branchId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "academic_events_createdById_idx" ON "academic_events"("createdById");

-- CreateIndex
CREATE INDEX "audit_logs_schoolId_entity_createdAt_idx" ON "audit_logs"("schoolId", "entity", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "course_enrollments_studentId_status_idx" ON "course_enrollments"("studentId", "status");

-- CreateIndex
CREATE INDEX "course_enrollments_courseId_status_idx" ON "course_enrollments"("courseId", "status");

-- CreateIndex
CREATE INDEX "discipline_incidents_studentId_date_idx" ON "discipline_incidents"("studentId", "date");

-- CreateIndex
CREATE INDEX "discipline_incidents_schoolId_resolved_date_idx" ON "discipline_incidents"("schoolId", "resolved", "date");

-- CreateIndex
CREATE INDEX "exam_sessions_studentId_status_idx" ON "exam_sessions"("studentId", "status");

-- CreateIndex
CREATE INDEX "exam_sessions_schoolId_status_idx" ON "exam_sessions"("schoolId", "status");

-- CreateIndex
CREATE INDEX "exam_sessions_examId_studentId_status_idx" ON "exam_sessions"("examId", "studentId", "status");

-- CreateIndex
CREATE INDEX "exams_classId_idx" ON "exams"("classId");

-- CreateIndex
CREATE INDEX "exams_subjectId_idx" ON "exams"("subjectId");

-- CreateIndex
CREATE INDEX "homeworks_classId_idx" ON "homeworks"("classId");

-- CreateIndex
CREATE INDEX "homeworks_subjectId_idx" ON "homeworks"("subjectId");

-- CreateIndex
CREATE INDEX "leads_branchId_status_idx" ON "leads"("branchId", "status");

-- CreateIndex
CREATE INDEX "leads_assignedToId_status_idx" ON "leads"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "leads_schoolId_nextContactDate_idx" ON "leads"("schoolId", "nextContactDate");

-- CreateIndex
CREATE INDEX "leave_requests_requesterId_status_idx" ON "leave_requests"("requesterId", "status");

-- CreateIndex
CREATE INDEX "leave_requests_branchId_status_idx" ON "leave_requests"("branchId", "status");

-- CreateIndex
CREATE INDEX "library_loans_studentId_returnDate_idx" ON "library_loans"("studentId", "returnDate");

-- CreateIndex
CREATE INDEX "library_loans_bookId_returnDate_idx" ON "library_loans"("bookId", "returnDate");

-- CreateIndex
CREATE INDEX "notifications_recipientId_isRead_createdAt_idx" ON "notifications"("recipientId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_recipientId_createdAt_idx" ON "notifications"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_schoolId_createdAt_idx" ON "notifications"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "payments_studentId_createdAt_idx" ON "payments"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "payments_schoolId_createdAt_idx" ON "payments"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "payments_status_createdAt_idx" ON "payments"("status", "createdAt");

-- CreateIndex
CREATE INDEX "schedules_classId_dayOfWeek_idx" ON "schedules"("classId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "schedules_roomId_dayOfWeek_idx" ON "schedules"("roomId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
