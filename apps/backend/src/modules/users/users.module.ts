import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UploadModule } from '@/modules/upload/upload.module';
import { AuthModule } from '@/modules/auth/auth.module';

@Module({
  imports: [UploadModule, AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
