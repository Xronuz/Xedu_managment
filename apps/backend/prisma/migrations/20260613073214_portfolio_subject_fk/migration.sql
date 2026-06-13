-- AddForeignKey
ALTER TABLE "student_achievements" ADD CONSTRAINT "student_achievements_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
