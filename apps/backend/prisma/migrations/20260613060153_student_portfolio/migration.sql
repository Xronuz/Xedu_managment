-- CreateEnum
CREATE TYPE "PortfolioCategory" AS ENUM ('sport', 'language_certificate', 'olympiad', 'academic', 'arts', 'other');

-- CreateEnum
CREATE TYPE "PortfolioLevel" AS ENUM ('school', 'district', 'region', 'republic', 'international');

-- CreateTable
CREATE TABLE "student_achievements" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "branchId" TEXT,
    "studentId" TEXT NOT NULL,
    "category" "PortfolioCategory" NOT NULL DEFAULT 'other',
    "title" TEXT NOT NULL,
    "level" "PortfolioLevel",
    "result" TEXT,
    "issuer" TEXT,
    "achievedAt" DATE NOT NULL,
    "expiresAt" DATE,
    "fileUrl" TEXT,
    "description" TEXT,
    "coinReward" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_achievements_studentId_idx" ON "student_achievements"("studentId");

-- CreateIndex
CREATE INDEX "student_achievements_studentId_category_idx" ON "student_achievements"("studentId", "category");

-- CreateIndex
CREATE INDEX "student_achievements_schoolId_branchId_idx" ON "student_achievements"("schoolId", "branchId");

-- CreateIndex
CREATE INDEX "student_achievements_verified_idx" ON "student_achievements"("verified");

-- AddForeignKey
ALTER TABLE "student_achievements" ADD CONSTRAINT "student_achievements_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_achievements" ADD CONSTRAINT "student_achievements_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_achievements" ADD CONSTRAINT "student_achievements_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_achievements" ADD CONSTRAINT "student_achievements_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_achievements" ADD CONSTRAINT "student_achievements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
