/*
  Warnings:

  - Added the required column `schoolId` to the `group_messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `group_messages` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('operational', 'alert', 'announcement', 'message', 'reminder', 'system');

-- CreateEnum
CREATE TYPE "AnnouncementPriority" AS ENUM ('low', 'normal', 'urgent');

-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('draft', 'scheduled', 'active', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'queued', 'sent', 'delivered', 'failed', 'cancelled');

-- AlterTable (safe migration for existing data)
ALTER TABLE "group_messages" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "schoolId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Populate schoolId from conversation's schoolId for existing rows
UPDATE "group_messages" gm
SET "schoolId" = c."schoolId"
FROM "conversations" c
WHERE gm."conversationId" = c."id";

-- Make schoolId NOT NULL after population
ALTER TABLE "group_messages" ALTER COLUMN "schoolId" SET NOT NULL;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "category" "NotificationCategory" NOT NULL DEFAULT 'system',
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "senderId" TEXT;

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "branchId" TEXT,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "priority" "AnnouncementPriority" NOT NULL DEFAULT 'normal',
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'draft',
    "targetRoles" "UserRole"[],
    "targetClassId" TEXT,
    "targetBranchIds" TEXT[],
    "scheduledAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "requireAck" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_receipts" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'pending',
    "attemptedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcements_schoolId_status_createdAt_idx" ON "announcements"("schoolId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "announcements_schoolId_branchId_status_idx" ON "announcements"("schoolId", "branchId", "status");

-- CreateIndex
CREATE INDEX "announcements_status_scheduledAt_idx" ON "announcements"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "announcement_receipts_userId_isRead_createdAt_idx" ON "announcement_receipts"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "announcement_receipts_announcementId_userId_key" ON "announcement_receipts"("announcementId", "userId");

-- CreateIndex
CREATE INDEX "notification_deliveries_notificationId_idx" ON "notification_deliveries"("notificationId");

-- CreateIndex
CREATE INDEX "notification_deliveries_status_createdAt_idx" ON "notification_deliveries"("status", "createdAt");

-- CreateIndex
CREATE INDEX "group_messages_schoolId_idx" ON "group_messages"("schoolId");

-- CreateIndex
CREATE INDEX "group_messages_conversationId_createdAt_idx" ON "group_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_category_idx" ON "notifications"("category");

-- CreateIndex
CREATE INDEX "notifications_priority_idx" ON "notifications"("priority");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_receipts" ADD CONSTRAINT "announcement_receipts_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_receipts" ADD CONSTRAINT "announcement_receipts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
