import { Tabs } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { useRealtime } from '@/realtime/use-realtime';
import { usePushRegistration } from '@/push/use-push';
import { PillTabBar } from '@/components/pill-tab-bar';
import { isTabVisible } from '@/config/tabs';

/**
 * (app) tab layout — barcha 8 role (MOBILE_FOUNDATION_SPEC §1.1).
 * Tab ko'rinishi `tabsForRole(role)` dan kelib chiqadi (yagona manba:
 * src/config/tabs.ts). `PillTabBar` ham shu config'ni ishlatadi — shu sabab
 * ro'yxatdan tashqari tab'lar ko'rinmaydi ham, href null bilan ro'yxatdan
 * tashqarida qoladi ham.
 */
export default function AppTabsLayout() {
  const role = (useAuthStore((s) => s.user?.role) ?? '').toLowerCase().trim();

  // Real-time bildirishnoma badge'i + push token
  useRealtime();
  usePushRegistration();

  // name → href: visible tab = undefined (default), hidden = null.
  const href = (name: string) => (isTabVisible(role, name) ? undefined : null);

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <PillTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ href: href('index') }} />
      <Tabs.Screen name="schedule" options={{ href: href('schedule') }} />
      <Tabs.Screen name="grades" options={{ href: href('grades') }} />
      <Tabs.Screen name="today" options={{ href: href('today') }} />
      <Tabs.Screen name="classes" options={{ href: href('classes') }} />
      <Tabs.Screen name="children" options={{ href: href('children') }} />
      <Tabs.Screen name="menu" options={{ href: href('menu') }} />
      <Tabs.Screen name="messages" options={{ href: href('messages') }} />
      <Tabs.Screen name="notifications" options={{ href: href('notifications') }} />
      <Tabs.Screen name="profile" options={{ href: href('profile') }} />
    </Tabs>
  );
}
