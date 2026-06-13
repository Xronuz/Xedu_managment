-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "address" TEXT,
ADD COLUMN     "bloodType" TEXT,
ADD COLUMN     "dateOfBirth" DATE,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "enrollmentDate" DATE,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "medicalNotes" TEXT,
ADD COLUMN     "studentIdNumber" TEXT,
ADD COLUMN     "teacherNotes" TEXT;
