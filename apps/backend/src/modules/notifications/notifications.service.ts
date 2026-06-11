import { Injectable, Logger, Optional, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';
import { EventsGateway } from '@/modules/gateway/events.gateway';
import { NotificationQueueService } from './notification-queue.service';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';

export class SendNotificationDto {
  recipientId: string;
  title: string;
  body: string;
  type?: string;
  category?: 'operational' | 'alert' | 'announcement' | 'message' | 'reminder' | 'system';
  priority?: 'low' | 'normal' | 'urgent';
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly eventsGateway: EventsGateway,
    @Optional() private readonly notificationQueue: NotificationQueueService,
  ) {}

  async send(dto: SendNotificationDto, currentUser: JwtPayload) {
    // Recipient validation — cross-tenant injection prevention
    const recipient = await this.prisma.user.findFirst({
      where: { id: dto.recipientId, schoolId: currentUser.schoolId! },
      select: { branchId: true, schoolId: true, notifPreferences: true },
    });
    if (!recipient) {
      throw new ForbiddenException('Qabul qiluvchi topilmadi yoki boshqa maktabga tegishli');
    }
    const branchId = recipient.branchId!;

    // Check notification preferences
    const prefs = (recipient.notifPreferences as any) ?? {};
    const channel = (dto.type as any) ?? 'in_app';
    if (!this.shouldSendToChannel(prefs, channel, dto.category ?? 'system')) {
      this.logger.log(`Bildirishnoma preferences tufayli o'tkazib yuborildi: ${dto.recipientId}`);
      return null;
    }

    const notification = await this.prisma.notification.create({
      data: {
        schoolId: currentUser.schoolId!,
        branchId,
        recipientId: dto.recipientId,
        senderId: currentUser.sub,
        title: dto.title,
        body: dto.body,
        type: channel,
        category: (dto.category as any) ?? 'system',
        priority: dto.priority ?? 'normal',
        metadata: dto.metadata,
      },
    });

    // Create delivery tracking record
    await this.prisma.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel,
        status: 'sent',
        deliveredAt: new Date(),
      },
    });

    // H-5: BullMQ orqali SMS/push yuborish
    if (dto.type === 'sms' || dto.type === 'push') {
      const recipientForSms = await this.prisma.user.findFirst({
        where: { id: dto.recipientId, schoolId: currentUser.schoolId! },
        select: { phone: true, email: true, firstName: true, lastName: true },
      }).catch(() => null);

      if (recipientForSms?.phone && dto.type === 'sms') {
        await this.notificationQueue?.queueSms({
          to: recipientForSms.phone,
          message: `${dto.title}: ${dto.body}`,
        }).catch(() => { /* Queue bo'lmasa davom etadi */ });
      }
    }

    // Real-time WebSocket push (in_app + push)
    if (dto.type !== 'sms') {
      this.eventsGateway?.emitToUser(dto.recipientId, 'notification:new', {
        id: notification.id,
        title: dto.title,
        body: dto.body,
        type: dto.type ?? 'in_app',
        category: dto.category ?? 'system',
        priority: dto.priority ?? 'normal',
      });
    }

    this.logger.log(`Bildirishnoma yuborildi: ${dto.recipientId} — ${dto.title}`);
    return notification;
  }

  private shouldSendToChannel(
    prefs: any,
    channel: string,
    category: string,
  ): boolean {
    // Default: all channels enabled
    const defaults: Record<string, boolean> = {
      in_app: true, email: true, sms: false, push: false,
    };
    // Check per-channel preference
    const channelPref = prefs[channel] ?? defaults[channel] ?? true;
    if (!channelPref) return false;
    // Check per-category preference (if defined)
    const catPrefs = prefs.categories?.[category];
    if (catPrefs && catPrefs[channel] === false) return false;
    return true;
  }

  async getMyNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true, branchId: true, role: true },
    });
    const where: any = { recipientId: userId };
    // For non-school-wide roles, filter notifications by branch
    // (Notification.branchId is required in the schema, so a null check is invalid)
    if (user?.branchId && !['super_admin', 'director'].includes(user.role)) {
      where.branchId = user.branchId;
    }
    const [notifications, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, isRead: false } }),
    ]);
    return { data: notifications, meta: { total, page, limit, unreadCount } };
  }

  async markAsRead(id: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id, recipientId: userId },
      data: { isRead: true, readAt: new Date() },
    });
    return { message: 'O‘qildi deb belgilandi' };
  }

  async markAllAsRead(userId: string) {
    const now = new Date();
    await this.prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true, readAt: now },
    });
    return { message: 'Barcha bildirishnomalar o‘qildi deb belgilandi' };
  }

  async deleteOne(id: string, userId: string) {
    await this.prisma.notification.deleteMany({
      where: { id, recipientId: userId },
    });
    return { message: 'Bildirishnoma o‘chirildi' };
  }

  async deleteAll(userId: string) {
    const { count } = await this.prisma.notification.deleteMany({
      where: { recipientId: userId },
    });
    return { message: `${count} ta bildirishnoma o‘chirildi`, count };
  }

  // ── Notification Preferences ──────────────────────────────────────────────

  async getPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notifPreferences: true },
    });
    const defaults = {
      sms_attendance: true,
      sms_payment:    true,
      email_grades:   true,
      email_homework: false,
      push_all:       true,
    };
    return { preferences: { ...defaults, ...(user?.notifPreferences as any ?? {}) } };
  }

  async updatePreferences(userId: string, prefs: Record<string, boolean>) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { notifPreferences: prefs },
    });
    return { message: 'Sozlamalar saqlandi', preferences: prefs };
  }

  /**
   * Direktor va adminlar uchun: maktab ichida rol yoki guruh bo'yicha toplu e'lon yuborish
   * targetGroup: 'all_staff' | 'all_teachers' | 'class_teachers' | 'all_parents' | 'all_students' | rol nomi
   */
  async broadcast(
    payload: { targetGroup: string; title: string; body: string; category?: string; priority?: string },
    currentUser: JwtPayload,
  ) {
    const schoolId = currentUser.schoolId!;
    const filter = buildTenantWhere(currentUser);

    const roleMap: Record<string, string[]> = {
      all_staff:      ['director', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian'],
      all_teachers:   ['teacher', 'class_teacher'],
      class_teachers: ['class_teacher'],
      all_parents:    ['parent'],
      all_students:   ['student'],
    };

    const roles = roleMap[payload.targetGroup]
      ? roleMap[payload.targetGroup]
      : [payload.targetGroup];

    const { schoolId: _, ...restFilter } = filter as any;
    const recipients = await this.prisma.user.findMany({
      where: { role: { in: roles as any }, isActive: true, ...restFilter, schoolId },
      select: { id: true, branchId: true, notifPreferences: true },
    });

    if (recipients.length === 0) {
      return { sent: 0, message: 'Maqsadli foydalanuvchilar topilmadi' };
    }

    const category = (payload.category as any) ?? 'announcement';
    const priority = payload.priority ?? 'normal';

    // Respect per-recipient preferences
    const eligibleRecipients = recipients.filter(r => {
      const prefs = (r.notifPreferences as any) ?? {};
      return this.shouldSendToChannel(prefs, 'in_app', category);
    });

    if (eligibleRecipients.length === 0) {
      return { sent: 0, message: 'Barcha qabul qiluvchilar bildirishnoma sozlamalarini o‘chirgan' };
    }

    await this.prisma.notification.createMany({
      data: eligibleRecipients.map(r => ({
        schoolId,
        branchId: r.branchId || currentUser.branchId!,
        recipientId: r.id,
        senderId: currentUser.sub,
        title: payload.title,
        body: payload.body,
        type: 'in_app' as any,
        category,
        priority,
      })),
    });

    this.eventsGateway?.emitToSchool(schoolId, 'notification:broadcast', {
      title: payload.title,
      body: payload.body,
      targetGroup: payload.targetGroup,
      category,
      priority,
    });

    this.logger.log(`Broadcast: "${payload.title}" → ${payload.targetGroup} (${eligibleRecipients.length} ta)`);
    return { sent: eligibleRecipients.length, message: `${eligibleRecipients.length} ta foydalanuvchiga e'lon yuborildi` };
  }

  async createInApp(data: {
    schoolId: string;
    recipientId: string;
    title: string;
    body: string;
    type: any;
    metadata?: any;
    branchId?: string | null;
    senderId?: string | null;
    category?: any;
    priority?: string;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        schoolId: data.schoolId,
        branchId: data.branchId!,
        recipientId: data.recipientId,
        senderId: data.senderId,
        title: data.title,
        body: data.body,
        type: data.type,
        category: data.category ?? 'system',
        priority: data.priority ?? 'normal',
        metadata: data.metadata,
      },
    });

    await this.prisma.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel: data.type,
        status: 'sent',
        deliveredAt: new Date(),
      },
    });

    this.eventsGateway?.emitNotification(data.schoolId, {
      id: notification.id,
      recipientId: data.recipientId,
      title: data.title,
      body: data.body,
      category: data.category ?? 'system',
      priority: data.priority ?? 'normal',
    });

    return notification;
  }

  // ── Observability: Notification storm detection ───────────────────────────

  async detectNotificationStorm(userId: string, windowMinutes = 60): Promise<{ count: number; isStorm: boolean }> {
    const since = new Date(Date.now() - windowMinutes * 60_000);
    const count = await this.prisma.notification.count({
      where: { recipientId: userId, createdAt: { gte: since } },
    });
    return { count, isStorm: count > 50 };
  }

  async getQueueHealth() {
    const since = new Date(Date.now() - 24 * 60 * 60_000);
    const [totalCreated, totalFailed, totalDelivered, avgDeliveryTime] = await Promise.all([
      this.prisma.notificationDelivery.count({ where: { createdAt: { gte: since } } }),
      this.prisma.notificationDelivery.count({ where: { status: 'failed', createdAt: { gte: since } } }),
      this.prisma.notificationDelivery.count({ where: { status: 'delivered', createdAt: { gte: since } } }),
      this.prisma.notificationDelivery.aggregate({
        where: {
          status: 'delivered',
          attemptedAt: { not: null },
          deliveredAt: { not: null },
          createdAt: { gte: since },
        },
        _avg: {
          // Can't directly avg timestamps; this is a placeholder
        },
      }),
    ]);

    const failureRate = totalCreated > 0 ? Math.round((totalFailed / totalCreated) * 100) : 0;

    return {
      totalCreated,
      totalFailed,
      totalDelivered,
      failureRate,
      isHealthy: failureRate < 20,
    };
  }
}
