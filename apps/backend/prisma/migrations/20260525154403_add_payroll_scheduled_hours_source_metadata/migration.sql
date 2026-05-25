-- AlterTable
ALTER TABLE "payroll_items" ADD COLUMN     "scheduledHoursCalculatedAt" TIMESTAMP(3),
ADD COLUMN     "scheduledHoursOverrideReason" TEXT,
ADD COLUMN     "scheduledHoursSource" TEXT;
