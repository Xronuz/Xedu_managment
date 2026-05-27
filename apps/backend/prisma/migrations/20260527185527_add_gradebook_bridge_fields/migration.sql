-- AlterTable
ALTER TABLE "grades" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "examId" TEXT,
ADD COLUMN     "homeworkId" TEXT,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "weight" DOUBLE PRECISION NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "grades_homeworkId_idx" ON "grades"("homeworkId");

-- CreateIndex
CREATE INDEX "grades_examId_idx" ON "grades"("examId");

-- CreateIndex
CREATE INDEX "grades_source_idx" ON "grades"("source");

-- CreateIndex
CREATE INDEX "grades_isPublished_idx" ON "grades"("isPublished");

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "homeworks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
