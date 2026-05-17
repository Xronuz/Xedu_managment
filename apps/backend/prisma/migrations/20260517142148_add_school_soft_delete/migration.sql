-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'school_deleted';

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT;
