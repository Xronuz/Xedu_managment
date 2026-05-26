import { Module } from '@nestjs/common';
import { OpsCommandCenterController } from './ops-command-center.controller';
import { OpsCommandCenterService } from './ops-command-center.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { RedisModule } from '@/common/redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [OpsCommandCenterController],
  providers: [OpsCommandCenterService],
  exports: [OpsCommandCenterService],
})
export class OpsCommandCenterModule {}
