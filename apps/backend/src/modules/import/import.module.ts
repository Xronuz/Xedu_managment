import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { UsersModule } from '@/modules/users/users.module';
import { ScheduleModule } from '@/modules/schedule/schedule.module';

@Module({
  imports: [UsersModule, ScheduleModule],
  controllers: [ImportController],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}
