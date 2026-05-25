-- AddForeignKey
ALTER TABLE "teacher_substitutions" ADD CONSTRAINT "teacher_substitutions_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
