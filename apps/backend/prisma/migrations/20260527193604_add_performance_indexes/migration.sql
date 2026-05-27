-- CreateIndex
CREATE INDEX "coin_transactions_metadata_idx" ON "coin_transactions" USING GIN ("metadata" jsonb_path_ops);

-- CreateIndex
CREATE INDEX "exam_sessions_examId_status_submittedAt_idx" ON "exam_sessions"("examId", "status", "submittedAt");

-- CreateIndex
CREATE INDEX "exams_classId_scheduledAt_idx" ON "exams"("classId", "scheduledAt");

-- CreateIndex
CREATE INDEX "exams_scheduledAt_isPublished_idx" ON "exams"("scheduledAt", "isPublished");

-- CreateIndex
CREATE INDEX "grades_createdById_idx" ON "grades"("createdById");

-- CreateIndex
CREATE INDEX "grades_studentId_isPublished_idx" ON "grades"("studentId", "isPublished");

-- CreateIndex
CREATE INDEX "grades_classId_subjectId_type_date_idx" ON "grades"("classId", "subjectId", "type", "date");

-- CreateIndex
CREATE INDEX "homework_submissions_studentId_idx" ON "homework_submissions"("studentId");

-- CreateIndex
CREATE INDEX "homework_submissions_homeworkId_idx" ON "homework_submissions"("homeworkId");
