import { Injectable, Logger } from '@nestjs/common';
import { Expo, type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';
import { PrismaService } from '@/common/prisma/prisma.service';

/**
 * Expo orqali mobil push yuborish.
 *
 * Mobil ilova Expo push token (`ExponentPushToken[...]`) ni `DeviceToken`
 * jadvaliga ro'yxatdan o'tkazadi. Bu servis token(lar)ni topib, Expo push
 * xizmati orqali yuboradi. Yaroqsiz tokenlar (DeviceNotRegistered) o'chiriladi.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly expo = new Expo();

  constructor(private readonly prisma: PrismaService) {}

  /** Qurilma tokenini ro'yxatdan o'tkazish (upsert) */
  async registerToken(userId: string, token: string, platform = 'unknown') {
    if (!Expo.isExpoPushToken(token)) {
      this.logger.warn(`Yaroqsiz Expo push token rad etildi: ${String(token).slice(0, 16)}…`);
      return { ok: false };
    }
    await this.prisma.deviceToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform, lastSeenAt: new Date() },
    });
    return { ok: true };
  }

  /** Logout/qurilmadan chiqishda tokenni o'chirish */
  async unregisterToken(token: string) {
    await this.prisma.deviceToken.deleteMany({ where: { token } });
    return { ok: true };
  }

  /** Foydalanuvchining barcha qurilmalariga push yuborish (fire-and-forget) */
  async sendToUser(
    userId: string,
    payload: { title: string; body: string; data?: Record<string, unknown> },
  ): Promise<void> {
    const tokens = await this.prisma.deviceToken
      .findMany({ where: { userId }, select: { token: true } })
      .catch(() => [] as { token: string }[]);

    const valid = tokens.map((t) => t.token).filter((t) => Expo.isExpoPushToken(t));
    if (valid.length === 0) return;

    const messages: ExpoPushMessage[] = valid.map((to) => ({
      to,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      channelId: 'default',
    }));

    try {
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];
      for (const chunk of chunks) {
        const res = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...res);
      }
      // Darhol xatolarni tozalash — "DeviceNotRegistered" tokenlarni o'chiramiz
      await Promise.all(
        tickets.map((ticket, i) => {
          if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            return this.prisma.deviceToken.deleteMany({ where: { token: valid[i] } }).catch(() => undefined);
          }
          return undefined;
        }),
      );
    } catch (err) {
      this.logger.warn(`Push yuborishda xatolik: ${(err as Error).message}`);
    }
  }
}
