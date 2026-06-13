import { Module } from '@nestjs/common';
import { LeadsController, PublicLeadFormController } from './leads.controller';
import { LeadsService }    from './leads.service';
import { LeadsCronService } from './leads-cron.service';
import { PrismaModule }    from '@/common/prisma/prisma.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';

@Module({
  imports:     [PrismaModule, NotificationsModule],
  controllers: [LeadsController, PublicLeadFormController],
  providers:   [LeadsService, LeadsCronService],
  exports:     [LeadsService, LeadsCronService],
})
export class LeadsModule {}
