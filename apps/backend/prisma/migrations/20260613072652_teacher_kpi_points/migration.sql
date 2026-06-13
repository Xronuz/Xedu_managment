-- AlterTable
ALTER TABLE "student_achievements" ADD COLUMN     "subjectId" TEXT;

-- CreateTable
CREATE TABLE "teacher_kpi_points" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "branchId" TEXT,
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT,
    "achievementId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "level" "PortfolioLevel",
    "awardedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_kpi_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teacher_kpi_points_achievementId_key" ON "teacher_kpi_points"("achievementId");

-- CreateIndex
CREATE INDEX "teacher_kpi_points_schoolId_branchId_idx" ON "teacher_kpi_points"("schoolId", "branchId");

-- CreateIndex
CREATE INDEX "teacher_kpi_points_teacherId_idx" ON "teacher_kpi_points"("teacherId");

-- CreateIndex
CREATE INDEX "teacher_kpi_points_teacherId_createdAt_idx" ON "teacher_kpi_points"("teacherId", "createdAt");

-- CreateIndex
CREATE INDEX "teacher_kpi_points_schoolId_createdAt_idx" ON "teacher_kpi_points"("schoolId", "createdAt");

-- AddForeignKey
ALTER TABLE "teacher_kpi_points" ADD CONSTRAINT "teacher_kpi_points_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_kpi_points" ADD CONSTRAINT "teacher_kpi_points_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_kpi_points" ADD CONSTRAINT "teacher_kpi_points_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_kpi_points" ADD CONSTRAINT "teacher_kpi_points_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "student_achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
