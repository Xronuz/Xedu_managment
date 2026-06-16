import { Alert, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { notificationsApi, type NotificationsResponse } from '@/api/notifications';
import { Text } from './text';
import { Avatar } from './avatar';
import { StatCard } from './stat-card';
import { PlayfulTile } from './playful-tile';
import { levelFromCoins, PLAYFUL_COLORS } from '@/lib/gamify';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const TILES = [
  { route: '/me/attendance', icon: 'checkmark-done-circle', color: PLAYFUL_COLORS.green, labelKey: 'child.attendance' },
  { route: '/me/homework', icon: 'book', color: PLAYFUL_COLORS.amber, labelKey: 'me.homework' },
  { route: '/me/coins', icon: 'medal', color: PLAYFUL_COLORS.pink, labelKey: 'child.coins' },
] as const;

export function StudentHome({ name, avatarUrl, coins }: { name: string; avatarUrl?: string | null; coins: number }) {
  const { t } = useTranslation();
  const { theme, shadow } = useTheme();
  const router = useRouter();
  const { level, progress } = levelFromCoins(coins);

  const { data } = useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(1),
    staleTime: 30_000,
  });
  const unread = data?.meta?.unreadCount ?? 0;

  const comingSoon = () => Alert.alert(t('student.comingSoon') + ' ✨', t('home.comingSoon'));

  return (
    <View style={{ gap: spacing.lg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={name} uri={avatarUrl} size={48} />
        <View style={{ flex: 1 }}>
          <Text variant="heading" numberOfLines={1}>
            {t('student.hi')}, {name.split(' ')[0]}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="flash" size={13} color={theme.primary} />
            <Text variant="caption" color="textMuted">
              {t('student.progress')}: {Math.round(progress * 100)}%
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push('/notifications')}
          style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', ...shadow(1) }}
        >
          <Ionicons name="notifications-outline" size={22} color={theme.text} />
          {unread > 0 ? (
            <View style={{ position: 'absolute', top: 10, right: 11, width: 9, height: 9, borderRadius: 5, backgroundColor: theme.danger, borderWidth: 1.5, borderColor: theme.card }} />
          ) : null}
        </Pressable>
      </View>

      {/* Big playful hero */}
      <LinearGradient
        colors={[theme.heroFrom, theme.heroTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: radius.xxl, padding: spacing.xl, minHeight: 168, overflow: 'hidden', justifyContent: 'space-between', ...shadow(2) }}
      >
        <Ionicons name="rocket" size={120} color="rgba(255,255,255,0.10)" style={{ position: 'absolute', right: -12, top: -10 }} />
        <View>
          <Text variant="title" style={{ color: theme.onHero, fontSize: 24 }}>
            {t('student.heroTitle')}
          </Text>
          <Text variant="body" style={{ color: theme.onHeroMuted, marginTop: spacing.xs, maxWidth: '78%' }}>
            {t('student.heroSubtitle')}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/schedule')}
          style={{ marginTop: spacing.lg, width: 52, height: 52, borderRadius: radius.pill, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="arrow-forward" size={24} color={theme.heroFrom} />
        </Pressable>
      </LinearGradient>

      {/* Stats */}
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <StatCard icon="medal" value={coins} label={t('student.coins')} color={theme.accent} tint={theme.accentLight} />
        <StatCard icon="star" value={level} label={t('student.level')} color="#F59E0B" tint="rgba(245,181,61,0.16)" />
      </View>

      {/* Sections */}
      <Text variant="heading">{t('me.menu')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {TILES.map((tile) => (
          <PlayfulTile key={tile.route} icon={tile.icon} color={tile.color} label={t(tile.labelKey)} onPress={() => router.push(tile.route)} />
        ))}
        <PlayfulTile icon="school" color={PLAYFUL_COLORS.cyan} label={t('student.courses')} comingSoon onPress={comingSoon} />
        <PlayfulTile icon="game-controller" color={PLAYFUL_COLORS.pink} label={t('student.games')} comingSoon onPress={comingSoon} />
      </View>
    </View>
  );
}
