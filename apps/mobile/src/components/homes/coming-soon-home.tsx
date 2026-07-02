/**
 * ComingSoonHome — VP, Branch Admin, Accountant, Librarian uchun
 * placeholder home (Phase 1 Week 5'da to'ldiriladi). Boshqa home'lar bilan
 * bir xil props imzosiga ega. Role label + "tez orada" xabari ko'rsatadi.
 */
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth.store';
import { ROLE_LABELS } from '@/config/permissions';
import type { AppRole } from '@/config/permissions';
import { Text } from '../text';
import { HeroCard } from '../hero-card';
import { Avatar } from '../avatar';
import { EmptyState } from '../empty-state';
import { spacing } from '@/theme/tokens';
import { useTheme } from '../../theme/use-theme';

export function ComingSoonHome({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const role = (useAuthStore((s) => s.user?.role) ?? '').toLowerCase().trim() as AppRole;
  const roleLabel = ROLE_LABELS[role] ?? (role || '').toUpperCase();

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <HeroCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" style={{ color: theme.onHeroMuted }}>{t('home.welcome')}</Text>
            <Text variant="title" style={{ color: theme.onHero, marginTop: 2 }} numberOfLines={1}>{name}</Text>
            <Text variant="label" style={{ color: theme.onHeroMuted, marginTop: 4 }}>{roleLabel}</Text>
          </View>
          <Avatar name={name || '?'} uri={avatarUrl} size={56} />
        </View>
      </HeroCard>

      <EmptyState
        icon="construct-outline"
        title={t('home.comingSoon')}
        subtitle={t('home.notImplemented')}
      />
    </ScrollView>
  );
}
