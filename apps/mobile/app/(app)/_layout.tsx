import { Tabs } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { useRealtime } from '@/realtime/use-realtime';
import { usePushRegistration } from '@/push/use-push';
import { PillTabBar } from '@/components/pill-tab-bar';

export default function AppTabsLayout() {
  const role = (useAuthStore((s) => s.user?.role) ?? '').toLowerCase().trim();
  const isParent = role === 'parent';
  const isStudent = role === 'student';

  // Real-time bildirishnoma badge'i + push token
  useRealtime();
  usePushRegistration();

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <PillTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="schedule" options={{ href: isStudent ? undefined : null }} />
      <Tabs.Screen name="grades" options={{ href: isStudent ? undefined : null }} />
      <Tabs.Screen name="children" options={{ href: isParent ? undefined : null }} />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
