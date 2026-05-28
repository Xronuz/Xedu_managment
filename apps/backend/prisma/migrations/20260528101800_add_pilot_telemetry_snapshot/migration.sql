-- AlterTable
ALTER TABLE "discipline_incidents" ADD COLUMN     "resolvedById" TEXT;

-- CreateTable
CREATE TABLE "pilot_telemetry_snapshots" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "logins" INTEGER NOT NULL DEFAULT 0,
    "setupCompletions" INTEGER NOT NULL DEFAULT 0,
    "scheduleGenerations" INTEGER NOT NULL DEFAULT 0,
    "solverRuns" INTEGER NOT NULL DEFAULT 0,
    "exports" INTEGER NOT NULL DEFAULT 0,
    "attendanceActions" INTEGER NOT NULL DEFAULT 0,
    "gradePublishes" INTEGER NOT NULL DEFAULT 0,
    "homeworkSubmissions" INTEGER NOT NULL DEFAULT 0,
    "examSubmissions" INTEGER NOT NULL DEFAULT 0,
    "coinTransactions" INTEGER NOT NULL DEFAULT 0,
    "announcementReads" INTEGER NOT NULL DEFAULT 0,
    "invitationAccepts" INTEGER NOT NULL DEFAULT 0,
    "queueFailures" INTEGER NOT NULL DEFAULT 0,
    "error500s" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pilot_telemetry_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pilot_telemetry_snapshots_date_idx" ON "pilot_telemetry_snapshots"("date");

-- CreateIndex
CREATE UNIQUE INDEX "pilot_telemetry_snapshots_date_key" ON "pilot_telemetry_snapshots"("date");

-- AddForeignKey
ALTER TABLE "discipline_incidents" ADD CONSTRAINT "discipline_incidents_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_expectedClassId_fkey" FOREIGN KEY ("expectedClassId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
