import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { UsersModule } from '@/modules/users/users.module';
import { ClassesModule } from '@/modules/classes/classes.module';

@Module({
  imports: [UsersModule, ClassesModule],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
