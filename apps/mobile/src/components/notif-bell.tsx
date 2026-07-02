import { useEffect, useRef } from 'react';
import { Pressable, View, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { notificationsApi, type NotificationsResponse } from '@/api/notifications';
import { Text } from './text';
import { radius, anim } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact } from '@/lib/haptics';

/**
 * Bildirishnoma qo'ng'irog'i tugmasi — o'qilmagan soni bilan.
 * Yagona manba (oldin student-home + generic home'da dublikat edi).
 */
export function NotifBell({ count, surface }: { count?: 'dot' | 'number'; surface?: 'card' | 'glass' }) {
  const { theme, shadow } = useTheme();
  const router = useRouter();
  const { data } = useQuery<NotificationsResponse>({ queryKey: ['notifications'], queryFn: () => notificationsApi.list(1), staleTime: 30_000 });
  const unread = data?.meta?.unreadCount ?? 0;
  const mode = count ?? 'number';

  const badgeScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (unread > 0) {
      badgeScale.setValue(0);
      Animated.spring(badgeScale, {
        toValue: 1,
        ...anim.spring.bouncy,
        useNativeDriver: true,
      }).start();
    }
  }, [unread, badgeScale]);

  return (
    <Pressable
      onPress={() => { impact('light'); router.push('/notifications'); }}
      hitSlop={8}
      style={{ width: 46, height: 46, borderRadius: radius.md, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', ...shadow(1) }}
    >
      <Ionicons name="notifications-outline" size={22} color={theme.text} />
      {unread > 0 ? (
        mode === 'number' ? (
          <Animated.View style={{ position: 'absolute', top: 7, right: 8, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: theme.danger, borderWidth: 2, borderColor: theme.card, alignItems: 'center', justifyContent: 'center', transform: [{ scale: badgeScale }] }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{unread > 9 ? '9+' : unread}</Text>
          </Animated.View>
        ) : (
          <Animated.View style={{ position: 'absolute', top: 9, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: theme.danger, borderWidth: 1.5, borderColor: theme.card, transform: [{ scale: badgeScale }] }} />
        )
      ) : null}
    </Pressable>
  );
}
