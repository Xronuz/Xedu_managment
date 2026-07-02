/**
 * ParentHome (MOBILE_FOUNDATION_SPEC §5.3 H4 — polish).
 * Barcha farzandlar — har biri card preview bilan: ism, sinf, bugungi
 * davomat statusi, oxirgi baho, bajarilmagan uy vazifasi soni.
 *
 * Preview ma'lumotlari children endpointining agregatidan keladi (agar
 * backend `lastGrade`, `attendanceStatus` qaytarsa). Aks holda graceful
 * fallback — faqat ism + sinf ko'rsatiladi.
 */
import { RefreshControl, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { parentApi } from '@/api/parent';
import { Text } from '../text';
import { HeroCard } from '../hero-card';
import { Avatar } from '../avatar';
import { EmptyState } from '../empty-state';
import { ListSkeleton } from '../skeleton';
import { Surface } from '../dashboard-kit';
import { ErrorBanner } from '../error-banner';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact } from '@/lib/haptics';

interface ChildPreview {
  id: string;
  firstName?: string;
  lastName?: string;
  class?: { name: string } | null;
  avatarUrl?: string | null;
  // Agregat preview (backend bo'lsa; yo'q bo'lsa undefined — fallback).
  attendanceStatus?: 'present' | 'absent' | 'late' | null;
  lastGrade?: { score: number; subject?: string } | null;
  pendingHomework?: number;
}

export function ParentHome({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();

  const childrenQuery = useQuery<ChildPreview[]>({
    queryKey: ['parent', 'children'],
    queryFn: parentApi.getChildren,
  });

  function openChild(child: ChildPreview) {
    impact('light');
    router.push({
      pathname: '/child/[id]',
      params: { id: child.id, name: `${child.firstName ?? ''} ${child.lastName ?? ''}`.trim() },
    });
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
      refreshControl={<RefreshControl refreshing={childrenQuery.isRefetching} onRefresh={childrenQuery.refetch} tintColor={theme.primary} />}
    >
      <HeroCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" style={{ color: theme.onHeroMuted }}>{t('home.welcome')}</Text>
            <Text variant="title" style={{ color: theme.onHero, marginTop: 2 }} numberOfLines={1}>{name}</Text>
            <View style={{ alignSelf: 'flex-start', marginTop: spacing.sm, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: spacing.sm + 2, paddingVertical: 3, borderRadius: radius.pill }}>
              <Text variant="label" style={{ color: theme.onHero }}>{(t('role.parent') || 'PARENT').toUpperCase()}</Text>
            </View>
          </View>
          <Avatar name={name || '?'} uri={avatarUrl} size={56} />
        </View>
      </HeroCard>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Ionicons name="people" size={18} color={theme.text} />
        <Text variant="heading">{t('home.myChildren')}</Text>
      </View>

      {childrenQuery.isError ? (
        <ErrorBanner message={t('home.childrenLoadError')} onRetry={() => childrenQuery.refetch()} />
      ) : childrenQuery.isLoading ? (
        <ListSkeleton rows={2} />
      ) : childrenQuery.data && childrenQuery.data.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          {childrenQuery.data.map((child) => (
            <ChildCard key={child.id} child={child} onPress={() => openChild(child)} />
          ))}
        </View>
      ) : (
        <EmptyState icon="people-outline" title={t('home.noChildren')} subtitle={t('home.noChildrenSub')} />
      )}
    </ScrollView>
  );
}

function ChildCard({ child, onPress }: { child: ChildPreview; onPress: () => void }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const fullName = `${child.firstName ?? ''} ${child.lastName ?? ''}`.trim();

  // Graceful fallback: preview ma'lumotlari bo'lmasa ham card ko'rinadi.
  const attStatus = child.attendanceStatus;
  const attColor = attStatus === 'present' ? theme.success : attStatus === 'absent' ? theme.danger : attStatus === 'late' ? theme.warning : null;
  const attLabel = attStatus ? t(`attendance.${attStatus}`) : null;

  return (
    <Surface onPress={onPress} style={{ padding: spacing.lg, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={fullName || '?'} uri={child.avatarUrl} size={44} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>{fullName}</Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>{child.class?.name ?? t('child.noClass')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
      </View>

      {/* Preview chips (ma'lumot bo'lsa) */}
      {(attLabel || child.lastGrade || (child.pendingHomework ?? 0) > 0) ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          {attLabel && attColor ? (
            <Chip color={attColor} icon="checkmark-circle-outline" label={attLabel} />
          ) : null}
          {child.lastGrade ? (
            <Chip color={theme.accent} icon="star-outline" label={`${t('student.lastGrade')}: ${child.lastGrade.score}`} />
          ) : null}
          {(child.pendingHomework ?? 0) > 0 ? (
            <Chip color={theme.warning} icon="book-outline" label={t('home.homeworkPending', { n: child.pendingHomework })} />
          ) : null}
        </View>
      ) : null}
    </Surface>
  );
}

function Chip({ color, icon, label }: { color: string; icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm + 2, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: `${color}1A` }}>
      <Ionicons name={icon} size={13} color={color} />
      <Text variant="label" style={{ color, fontSize: 11 }}>{label}</Text>
    </View>
  );
}
