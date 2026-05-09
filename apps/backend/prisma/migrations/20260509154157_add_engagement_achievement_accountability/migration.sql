-- CreateEnum
CREATE TYPE "AchievementCategory" AS ENUM ('academic_effort', 'attendance', 'improvement', 'participation', 'recovery', 'discipline_recovery');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CoinTransactionReason" ADD VALUE 'attendance_monthly';
ALTER TYPE "CoinTransactionReason" ADD VALUE 'homework_consistency';
ALTER TYPE "CoinTransactionReason" ADD VALUE 'exam_high_score';
ALTER TYPE "CoinTransactionReason" ADD VALUE 'improvement_milestone';
ALTER TYPE "CoinTransactionReason" ADD VALUE 'participation';
ALTER TYPE "CoinTransactionReason" ADD VALUE 'recovery_bonus';
ALTER TYPE "CoinTransactionReason" ADD VALUE 'repeated_absence';
ALTER TYPE "CoinTransactionReason" ADD VALUE 'repeated_lateness';
ALTER TYPE "CoinTransactionReason" ADD VALUE 'exam_low_score';
ALTER TYPE "CoinTransactionReason" ADD VALUE 'cheating_incident';
ALTER TYPE "CoinTransactionReason" ADD VALUE 'severe_discipline';

-- AlterEnum
ALTER TYPE "ModuleName" ADD VALUE 'engagement';

-- AlterTable
ALTER TABLE "coin_transactions" ADD COLUMN     "awardedBy" TEXT,
ADD COLUMN     "comment" TEXT,
ADD COLUMN     "reversalOfId" TEXT,
ADD COLUMN     "reversedBy" TEXT;

-- AlterTable
ALTER TABLE "group_messages" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "AchievementCategory" NOT NULL,
    "criteria" JSONB NOT NULL,
    "rewardCoins" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPositive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "progress" JSONB NOT NULL,
    "unlockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagement_reputations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 100,
    "consecutiveGood" INTEGER NOT NULL DEFAULT 0,
    "lastDeductionAt" TIMESTAMP(3),
    "recoveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engagement_reputations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "achievements_schoolId_idx" ON "achievements"("schoolId");

-- CreateIndex
CREATE INDEX "achievements_schoolId_category_idx" ON "achievements"("schoolId", "category");

-- CreateIndex
CREATE INDEX "user_achievements_userId_idx" ON "user_achievements"("userId");

-- CreateIndex
CREATE INDEX "user_achievements_achievementId_idx" ON "user_achievements"("achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_userId_achievementId_key" ON "user_achievements"("userId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "engagement_reputations_userId_key" ON "engagement_reputations"("userId");

-- CreateIndex
CREATE INDEX "engagement_reputations_schoolId_idx" ON "engagement_reputations"("schoolId");

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_reputations" ADD CONSTRAINT "engagement_reputations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_reputations" ADD CONSTRAINT "engagement_reputations_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
