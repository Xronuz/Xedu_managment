/**
 * Jest uchun expo-server-sdk stub'i.
 *
 * Haqiqiy paket ESM (`node:assert` import'lari) bo'lgani uchun ts-jest uni
 * parse qila olmaydi. moduleNameMapper orqali testlarda shu stub ishlatiladi.
 */
export type ExpoPushMessage = {
  to: string;
  sound?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
};

export type ExpoPushTicket =
  | { status: 'ok'; id: string }
  | { status: 'error'; message: string; details?: { error?: string } };

export class Expo {
  static isExpoPushToken(token: unknown): boolean {
    return typeof token === 'string' && token.startsWith('ExponentPushToken');
  }

  chunkPushNotifications(messages: ExpoPushMessage[]): ExpoPushMessage[][] {
    return messages.length ? [messages] : [];
  }

  async sendPushNotificationsAsync(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
    return messages.map((_, i) => ({ status: 'ok' as const, id: `mock-ticket-${i}` }));
  }
}

export default Expo;
