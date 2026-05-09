import { Module } from '@nestjs/common';
import { CoinsController } from './coins.controller';
import { CoinsService }    from './coins.service';
import { EngagementModule } from '@/modules/engagement/engagement.module';

@Module({
  imports: [EngagementModule],
  controllers: [CoinsController],
  providers:   [CoinsService],
  exports:     [CoinsService],
})
export class CoinsModule {}
