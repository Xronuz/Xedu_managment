import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';

/**
 * CRM follow-up eslatmalari.
 * Har kuni ertalab har bir mas'ul xodimga bitta jamlama (digest) xabar:
 * bugun bog'lanish kerak bo'lgan va muddati o'tib ketgan leadlar.
 * Spam bo'lmasligi uchun lead boshiga emas — mas'ul boshiga kuniga 1 ta xabar.
 */
@Injectable()
export class LeadsCronService {
  private readonly logger = new Logger(LeadsCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  /** Har kuni 08:30 (Toshkent) — dushanba–shanba */
  @Cron('30 8 * * 1-6', { name: 'crm-followup-digest', timeZone: 'Asia/Tashkent' })
  async dailyFollowupDigest() {
    const sent = await this.sendFollowupDigests();
    if (sent) this.logger.log(`CRM follow-up digest: ${sent} ta mas'ulga yuborildi`);
  }

  async sendFollowupDigests(now = new Date()): Promise<number> {
    if (!this.notifications) return 0;

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Aktiv (yopilmagan/konvert qilinmagan), mas'uli bor, bog'lanish muddati
    // bugun yoki o'tib ketgan leadlar
    const due = await this.prisma.lead.findMany({
      where: {
        status: { notIn: ['CONVERTED', 'CLOSED'] },
        assignedToId: { not: null },
        nextContactDate: { lte: endOfToday },
      },
      select: {
        id: true, firstName: true, lastName: true, phone: true,
        nextContactDate: true, schoolId: true, branchId: true,
        assignedTo: { select: { id: true, branchId: true, isActive: true } },
      },
      take: 5000,
    });

    // Mas'ul bo'yicha guruhlash
    const byAssignee = new Map<string, typeof due>();
    for (const lead of due) {
      if (!lead.assignedTo?.isActive) continue;
      const list = byAssignee.get(lead.assignedTo.id) ?? [];
      list.push(lead);
      byAssignee.set(lead.assignedTo.id, list);
    }

    let sent = 0;
    for (const [assigneeId, leads] of byAssignee) {
      const today = leads.filter(l => l.nextContactDate! >= startOfToday);
      const overdue = leads.filter(l => l.nextContactDate! < startOfToday);

      const lines: string[] = [];
      if (today.length) {
        lines.push(`Bugun bog'lanish kerak (${today.length} ta):`);
        today.slice(0, 5).forEach(l => lines.push(`• ${l.firstName} ${l.lastName} — ${l.phone}`));
        if (today.length > 5) lines.push(`…va yana ${today.length - 5} ta`);
      }
      if (overdue.length) {
        lines.push(`Muddati o'tib ketgan (${overdue.length} ta):`);
        overdue.slice(0, 5).forEach(l => lines.push(`• ${l.firstName} ${l.lastName} — ${l.phone}`));
        if (overdue.length > 5) lines.push(`…va yana ${overdue.length - 5} ta`);
      }

      const branchId = leads[0].assignedTo!.branchId ?? leads[0].branchId;
      try {
        await this.notifications.createInApp({
          schoolId: leads[0].schoolId,
          branchId,
          recipientId: assigneeId,
          title: `CRM: ${leads.length} ta lead bog'lanishni kutmoqda`,
          body: lines.join('\n'),
          type: 'in_app',
          category: 'reminder',
          priority: overdue.length ? 'high' : 'normal',
          metadata: { todayCount: today.length, overdueCount: overdue.length },
        });
        sent++;
      } catch (e) {
        this.logger.error(`CRM digest xatosi (user=${assigneeId}): ${e instanceof Error ? e.message : e}`);
      }
    }
    return sent;
  }
}
