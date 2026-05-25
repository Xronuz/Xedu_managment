import { Module } from '@nestjs/common';
import { PeriodsController } from './periods.controller';
import { PeriodsService }    from './periods.service';
import { PrismaModule }      from '@/common/prisma/prisma.module';

@Module({
  imports:     [PrismaModule],
  controllers: [PeriodsController],
  providers:   [PeriodsService],
  exports:     [PeriodsService],
})
export class PeriodsModule {}
