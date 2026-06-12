-- AlterTable
ALTER TABLE "kpi_metrics" ADD COLUMN     "ownerId" TEXT;

-- AddForeignKey
ALTER TABLE "kpi_metrics" ADD CONSTRAINT "kpi_metrics_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
