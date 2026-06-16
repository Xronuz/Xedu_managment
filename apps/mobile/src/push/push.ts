import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { notificationsApi } from '@/api/notifications';

/** Expo Go'да remote push yo'q (SDK 53+) — bu yerda butunlay o'tkazib yuboramiz. */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Mobil push (Expo). DIQQAT: remote push **Expo Go**да (Android, SDK 53+) qo'llab-
 * quvvatlanmaydi — to'liq ishlashi uchun **development build** (EAS) kerak.
 * Bu yerda barcha chaqiruvlar xavfsiz (xato yutiladi), Expo Go'да ilova buzilmaydi.
 */

let currentToken: string | null = null;

// Foreground'да bildirishnoma banner + ovoz ko'rsatiladi
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0F7B53',
  }).catch(() => {});
}

function getProjectId(): string | undefined {
  return (
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId
  );
}

/** Ruxsat so'rab, Expo push token oladi va backendга ro'yxatdan o'tkazadi. */
export async function registerForPush(): Promise<void> {
  try {
    if (isExpoGo) return; // Expo Go — push yo'q, dev build kerak
    if (!Device.isDevice) return; // simulyator/emulyatorда push yo'q

    await ensureAndroidChannel();

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    const projectId = getProjectId();
    const tokenResp = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    currentToken = tokenResp.data;

    await notificationsApi.registerDeviceToken(currentToken, Platform.OS).catch(() => {});
  } catch {
    // Expo Go (Android) yoki ruxsat yo'q — jim o'tkazib yuboramiz
  }
}

/** Logout'да tokenni backenddan o'chiradi. */
export async function unregisterForPush(): Promise<void> {
  if (!currentToken) return;
  try {
    await notificationsApi.unregisterDeviceToken(currentToken);
  } catch {
    /* noop */
  }
  currentToken = null;
}
