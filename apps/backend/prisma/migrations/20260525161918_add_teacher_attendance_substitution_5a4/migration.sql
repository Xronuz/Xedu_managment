-- CreateEnum
CREATE TYPE "TeacherAttendanceStatus" AS ENUM ('present', 'absent', 'late', 'excused', 'substituted');

-- CreateEnum
CREATE TYPE "SubstitutionStatus" AS ENUM ('proposed', 'approved', 'rejected', 'applied', 'cancelled');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeaveType" ADD VALUE 'unpaid';
ALTER TYPE "LeaveType" ADD VALUE 'paid';
ALTER TYPE "LeaveType" ADD VALUE 'vacation';
ALTER TYPE "LeaveType" ADD VALUE 'training';
ALTER TYPE "LeaveType" ADD VALUE 'business_trip';
ALTER TYPE "LeaveType" ADD VALUE 'maternity';
ALTER TYPE "LeaveType" ADD VALUE 'emergency';

-- AlterTable
ALTER TABLE "leave_requests" ADD COLUMN     "affectsPayroll" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "affectsSchedule" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "teacher_attendances" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "TeacherAttendanceStatus" NOT NULL DEFAULT 'present',
    "scheduleId" TEXT,
    "notes" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_substitutions" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "originalTeacherId" TEXT NOT NULL,
    "substituteTeacherId" TEXT NOT NULL,
    "status" "SubstitutionStatus" NOT NULL DEFAULT 'proposed',
    "reason" TEXT,
    "notes" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_substitutions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teacher_attendances_schoolId_branchId_idx" ON "teacher_attendances"("schoolId", "branchId");

-- CreateIndex
CREATE INDEX "teacher_attendances_teacherId_date_idx" ON "teacher_attendances"("teacherId", "date");

-- CreateIndex
CREATE INDEX "teacher_attendances_status_idx" ON "teacher_attendances"("status");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_attendances_teacherId_date_scheduleId_key" ON "teacher_attendances"("teacherId", "date", "scheduleId");

-- CreateIndex
CREATE INDEX "teacher_substitutions_schoolId_branchId_idx" ON "teacher_substitutions"("schoolId", "branchId");

-- CreateIndex
CREATE INDEX "teacher_substitutions_originalTeacherId_idx" ON "teacher_substitutions"("originalTeacherId");

-- CreateIndex
CREATE INDEX "teacher_substitutions_substituteTeacherId_idx" ON "teacher_substitutions"("substituteTeacherId");

-- CreateIndex
CREATE INDEX "teacher_substitutions_status_idx" ON "teacher_substitutions"("status");

-- CreateIndex
CREATE INDEX "teacher_substitutions_date_idx" ON "teacher_substitutions"("date");

-- AddForeignKey
ALTER TABLE "teacher_attendances" ADD CONSTRAINT "teacher_attendances_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_attendances" ADD CONSTRAINT "teacher_attendances_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_attendances" ADD CONSTRAINT "teacher_attendances_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_substitutions" ADD CONSTRAINT "teacher_substitutions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_substitutions" ADD CONSTRAINT "teacher_substitutions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_substitutions" ADD CONSTRAINT "teacher_substitutions_originalTeacherId_fkey" FOREIGN KEY ("originalTeacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_substitutions" ADD CONSTRAINT "teacher_substitutions_substituteTeacherId_fkey" FOREIGN KEY ("substituteTeacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_substitutions" ADD CONSTRAINT "teacher_substitutions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
