import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi, type NotificationsResponse } from '@/api/notifications';
import { useAuthStore } from '@/store/auth.store';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const ICONS: Record<string, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }> = {
  index: { on: 'home', off: 'home-outline' },
  schedule: { on: 'calendar', off: 'calendar-outline' },
  grades: { on: 'stats-chart', off: 'stats-chart-outline' },
  children: { on: 'people', off: 'people-outline' },
  notifications: { on: 'notifications', off: 'notifications-outline' },
  profile: { on: 'person', off: 'person-outline' },
};

interface TabRoute {
  key: string;
  name: string;
}
interface PillTabBarProps {
  state: { index: number; routes: TabRoute[] };
  navigation: {
    navigate: (name: string) => void;
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
  };
}

/** Reference uslubidagi suzuvchi "pill" bottom navigation. */
export function PillTabBar({ state, navigation }: PillTabBarProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const role = (useAuthStore((s) => s.user?.role) ?? '').toLowerCase().trim();

  const { data } = useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(1),
    staleTime: 30_000,
  });
  const unread = data?.meta?.unreadCount ?? 0;

  const pillBg = isDark ? theme.cardElevated : '#0E2A1E';
  const inactiveColor = isDark ? theme.textMuted : 'rgba(255,255,255,0.6)';

  // Rolga qarab ko'rinadigan tablar tartibi
  const order =
    role === 'student' ? ['index', 'schedule', 'grades', 'notifications', 'profile']
    : role === 'parent' ? ['index', 'children', 'notifications', 'profile']
    : ['index', 'notifications', 'profile'];

  const items = order
    .map((name) => state.routes.find((r) => r.name === name))
    .filter((r): r is TabRoute => !!r);

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingBottom: Math.max(insets.bottom, 12) }}>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: pillBg,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.sm,
          gap: spacing.xs,
          borderWidth: isDark ? 1 : 0,
          borderColor: theme.border,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0 : 0.25,
          shadowRadius: 16,
          elevation: 8,
        }}
      >
        {items.map((route) => {
          const originalIndex = state.routes.findIndex((r) => r.key === route.key);
          const focused = state.index === originalIndex;
          const icon = ICONS[route.name];
          const isBell = route.name === 'notifications';

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              hitSlop={6}
              style={{
                width: 50,
                height: 50,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? theme.primary : 'transparent',
              }}
            >
              <Ionicons name={focused ? icon.on : icon.off} size={23} color={focused ? '#FFFFFF' : inactiveColor} />
              {isBell && unread > 0 ? (
                <View style={{ position: 'absolute', top: 9, right: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.danger }} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
