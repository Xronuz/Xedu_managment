-- CreateEnum
CREATE TYPE "TeachingLoadStatus" AS ENUM ('draft', 'approved', 'archived');

-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('class', 'group', 'elective', 'club');

-- CreateEnum
CREATE TYPE "Semester" AS ENUM ('first', 'second', 'full_year');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('sick', 'personal', 'family', 'other', 'professional');

-- AlterTable
ALTER TABLE "leave_requests" ADD COLUMN     "type" "LeaveType";

-- CreateTable
CREATE TABLE "teaching_loads" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "hoursPerWeek" INTEGER NOT NULL DEFAULT 2,
    "hoursPerYear" INTEGER,
    "semester" "Semester" DEFAULT 'full_year',
    "groupType" "GroupType" DEFAULT 'class',
    "isSplitClass" BOOLEAN NOT NULL DEFAULT false,
    "coefficient" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "status" "TeachingLoadStatus" NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teaching_loads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teaching_loads_schoolId_branchId_idx" ON "teaching_loads"("schoolId", "branchId");

-- CreateIndex
CREATE INDEX "teaching_loads_teacherId_idx" ON "teaching_loads"("teacherId");

-- CreateIndex
CREATE INDEX "teaching_loads_classId_idx" ON "teaching_loads"("classId");

-- CreateIndex
CREATE INDEX "teaching_loads_subjectId_idx" ON "teaching_loads"("subjectId");

-- CreateIndex
CREATE INDEX "teaching_loads_status_idx" ON "teaching_loads"("status");

-- CreateIndex
CREATE UNIQUE INDEX "teaching_loads_teacherId_subjectId_classId_semester_status_key" ON "teaching_loads"("teacherId", "subjectId", "classId", "semester", "status");

-- AddForeignKey
ALTER TABLE "teaching_loads" ADD CONSTRAINT "teaching_loads_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_loads" ADD CONSTRAINT "teaching_loads_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_loads" ADD CONSTRAINT "teaching_loads_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_loads" ADD CONSTRAINT "teaching_loads_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_loads" ADD CONSTRAINT "teaching_loads_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
