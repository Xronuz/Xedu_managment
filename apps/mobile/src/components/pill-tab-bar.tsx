import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi, type NotificationsResponse } from '@/api/notifications';
import { messagingApi, type Conversation } from '@/api/messaging';
import { useAuthStore } from '@/store/auth.store';
import { Glass } from './glass';
import { spacing, anim } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact } from '@/lib/haptics';
import { tabsForRole, TAB_ICONS, type TabName } from '@/config/tabs';

interface TabRoute { key: string; name: string }
interface PillTabBarProps {
  state: { index: number; routes: TabRoute[] };
  navigation: {
    navigate: (name: string) => void;
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
  };
}

/** Liquid Glass suzuvchi bottom navigation — Xedu signature elementi. v2 */
export function PillTabBar({ state, navigation }: PillTabBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const role = (useAuthStore((s) => s.user?.role) ?? '').toLowerCase().trim();

  const { data } = useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(1),
    staleTime: 30_000,
  });
  const unread = data?.meta?.unreadCount ?? 0;
  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ['messaging', 'conversations'],
    queryFn: messagingApi.conversations,
    staleTime: 30_000,
  });
  const unreadMessages = (conversations ?? []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  // Yagona manba: src/config/tabs.ts — barcha 8 role uchun tab tartibi.
  const order: TabName[] = tabsForRole(role);

  const items = order.map((name) => state.routes.find((r) => r.name === name)).filter((r): r is TabRoute => !!r);

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        paddingBottom: Math.max(insets.bottom, 12),
      }}
      pointerEvents="box-none"
    >
      <Glass variant="nav" intensity={70} emerald bright>
        <View style={{ flexDirection: 'row', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, gap: spacing.xs }}>
          {items.map((route, idx) => {
            const originalIndex = state.routes.findIndex((r) => r.key === route.key);
            const focused = state.index === originalIndex;
            const entry = TAB_ICONS[route.name as TabName] ?? { on: 'square' as const, off: 'square-outline' as const };
            const dot = (route.name === 'notifications' && unread > 0) || (route.name === 'messages' && unreadMessages > 0);
            return (
              <TabItem
                key={route.key}
                focused={focused}
                iconOn={entry.on as keyof typeof Ionicons.glyphMap}
                iconOff={entry.off as keyof typeof Ionicons.glyphMap}
                dot={dot}
                badgeCount={
                  route.name === 'notifications' ? unread
                    : route.name === 'messages' ? unreadMessages
                      : 0
                }
                delay={idx * 40}
                onPress={() => {
                  impact('light');
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
                }}
                primary={theme.primary}
                primaryGlow={`${theme.primary}26`}
                inactive={theme.textSecondary}
                danger={theme.danger}
              />
            );
          })}
        </View>
      </Glass>
    </View>
  );
}

function TabItem({
  focused, iconOn, iconOff, dot, badgeCount, delay, onPress, primary, primaryGlow, inactive, danger,
}: {
  focused: boolean;
  iconOn: keyof typeof Ionicons.glyphMap;
  iconOff: keyof typeof Ionicons.glyphMap;
  dot: boolean;
  badgeCount: number;
  delay: number;
  onPress: () => void;
  primary: string;
  primaryGlow: string;
  inactive: string;
  danger: string;
}) {
  const scale = useRef(new Animated.Value(focused ? 1 : 0.88)).current;
  const glow = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const dotScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1 : 0.88,
      ...anim.spring.gentle,
      useNativeDriver: true,
    }).start();
    Animated.timing(glow, {
      toValue: focused ? 1 : 0,
      duration: anim.duration.normal,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  useEffect(() => {
    if (dot) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(dotScale, {
            toValue: 1.4,
            duration: 400,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(dotScale, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      Animated.timing(dotScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [dot]);

  return (
    <Pressable onPress={onPress} hitSlop={6} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: 44, height: 44, borderRadius: 18, backgroundColor: primaryGlow, opacity: glow, transform: [{ scale: glow }] }} />
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={focused ? iconOn : iconOff} size={23} color={focused ? primary : inactive} />
      </Animated.View>
      {dot && <Animated.View style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: danger, transform: [{ scale: dotScale }] }} />}
    </Pressable>
  );
}
