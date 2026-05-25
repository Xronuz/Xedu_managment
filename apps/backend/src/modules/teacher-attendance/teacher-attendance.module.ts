import { Module } from '@nestjs/common';
import { TeacherAttendanceService } from './teacher-attendance.service';
import { SubstitutionWorkflowService } from './substitution-workflow.service';
import { TeacherAttendanceController } from './teacher-attendance.controller';
import { AuditService } from '@/common/audit/audit.service';

@Module({
  controllers: [TeacherAttendanceController],
  providers: [TeacherAttendanceService, SubstitutionWorkflowService, AuditService],
  exports: [TeacherAttendanceService, SubstitutionWorkflowService],
})
export class TeacherAttendanceModule {}
