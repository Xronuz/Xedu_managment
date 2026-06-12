-- CreateEnum
CREATE TYPE "KpiSourceType" AS ENUM ('MANUAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "KpiDirection" AS ENUM ('HIGHER_IS_BETTER', 'LOWER_IS_BETTER');

-- AlterTable
ALTER TABLE "kpi_metrics" ADD COLUMN     "direction" "KpiDirection" NOT NULL DEFAULT 'HIGHER_IS_BETTER',
ADD COLUMN     "sourceKey" TEXT,
ADD COLUMN     "sourceType" "KpiSourceType" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "kpi_records" ADD COLUMN     "isAuto" BOOLEAN NOT NULL DEFAULT false;
