import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text } from './text';
import { HeroCard } from './hero-card';
import { Avatar } from './avatar';
import { levelFromCoins } from '@/lib/gamify';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Gamified o'quvchi hero — salom + tanga + daraja (progress bar). */
export function StudentHero({ name, avatarUrl, coins }: { name: string; avatarUrl?: string | null; coins: number }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { level, current, needed, progress } = levelFromCoins(coins);

  const chipBg = 'rgba(255,255,255,0.16)';

  return (
    <HeroCard>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" style={{ color: theme.onHeroMuted }}>
            {t('student.hi')} 👋
          </Text>
          <Text variant="title" style={{ color: theme.onHero, marginTop: 2 }} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <Avatar name={name} uri={avatarUrl} size={56} />
      </View>

      {/* Gamification stats */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: chipBg, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md }}>
          <Ionicons name="medal" size={18} color={theme.accent} />
          <Text variant="bodyStrong" style={{ color: theme.onHero }}>
            {coins}
          </Text>
          <Text variant="caption" style={{ color: theme.onHeroMuted }}>
            {t('student.coins')}
          </Text>
        </View>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: chipBg, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md }}>
          <Ionicons name="star" size={18} color="#FBBF24" />
          <Text variant="bodyStrong" style={{ color: theme.onHero }}>
            {t('student.levelN', { n: level })}
          </Text>
        </View>
      </View>

      {/* Progress to next level */}
      <View style={{ marginTop: spacing.md }}>
        <View style={{ height: 8, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
          <View style={{ width: `${Math.round(progress * 100)}%`, height: '100%', backgroundColor: theme.accent, borderRadius: radius.pill }} />
        </View>
        <Text variant="label" style={{ color: theme.onHeroMuted, marginTop: 6 }}>
          {current}/{needed} {t('student.toNext')}
        </Text>
      </View>
    </HeroCard>
  );
}
