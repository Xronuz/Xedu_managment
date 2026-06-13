-- AlterTable
ALTER TABLE "schools" ADD COLUMN "crmFormToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "schools_crmFormToken_key" ON "schools"("crmFormToken");
