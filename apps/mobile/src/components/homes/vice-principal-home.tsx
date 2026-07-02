/**
 * VicePrincipalHome (NEW — MOBILE_FOUNDATION_SPEC §5.3 H6).
 * Ta'lim sifati monitoring + schedule nazorat.
 *
 * Focus: bugungi dars jadvali holati.
 * Metrics: jami o'quvchilar, bugungi sinflar, bugungi o'qituvchilar.
 * Quick: Schedule, Students, Ops, Calendar, Announcements.
 *
 * Hech qachon: revenue/finance (Accountant), staff management (Director),
 * system settings (Director).
 */
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { opsApi, type OpsSummary } from '@/api/analytics';
import { insightsApi, type SchoolPulse } from '@/api/analytics';
import { Text } from '../text';
import { Avatar } from '../avatar';
import { NotifBell } from '../notif-bell';
import { FocusBlock, DashMetric, DashAction, Skel } from '../dashboard-kit';
import { ErrorBanner } from '../error-banner';
import { spacing } from '@/theme/tokens';
import { impact } from '@/lib/haptics';

const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const UZ_DAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];

export function VicePrincipalHome({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const { t } = useTranslation();
  const router = useRouter();
  const now = new Date();
  const dateLabel = `${UZ_DAYS[now.getDay()]}, ${now.getDate()} ${UZ_MONTHS[now.getMonth()]}`;

  const opsQ = useQuery<OpsSummary>({ queryKey: ['ops', 'summary'], queryFn: opsApi.summary, retry: false });
  const pulseQ = useQuery<SchoolPulse>({ queryKey: ['insights', 'pulse'], queryFn: insightsApi.pulse, retry: false });
  const loading = opsQ.isLoading || pulseQ.isLoading;

  const classesToday = opsQ.data?.stats.totalClassesToday ?? 0;
  const teachersToday = opsQ.data?.stats.totalTeachersToday ?? 0;
  const conflicts = opsQ.data?.schedule.conflicts ?? 0;
  const pendingSubs = opsQ.data?.substitutions.pendingProposals ?? 0;
  const totalStudents = pulseQ.data?.totalStudents ?? 0;
  const attendanceRate = pulseQ.data?.today.attendanceRate;

  const focus = conflicts > 0
    ? { tone: 'danger' as const, icon: 'warning' as const, title: t('vp.focus.conflicts', { n: conflicts }), subtitle: t('vp.focus.conflictsSub'), route: '/more/ops' }
    : pendingSubs > 0
      ? { tone: 'warning' as const, icon: 'swap-horizontal' as const, title: t('vp.focus.subs', { n: pendingSubs }), subtitle: t('vp.focus.subsSub'), route: '/more/substitutions' }
      : { tone: 'success' as const, icon: 'shield-checkmark' as const, title: t('vp.focus.allGood'), subtitle: t('vp.focus.allGoodSub'), route: '/more/ops' };

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={name || '?'} uri={avatarUrl} size={46} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>{name}</Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>{t('role.vice_principal')} · {dateLabel}</Text>
        </View>
        <NotifBell />
      </View>

      {opsQ.isError ? (
        <ErrorBanner message={t('ops.loadError')} onRetry={() => opsQ.refetch()} />
      ) : null}

      <FocusBlock
        label={t('vp.focusTitle')}
        tone={focus.tone}
        icon={focus.icon}
        title={focus.title}
        subtitle={focus.subtitle}
        loading={loading}
        onPress={() => { impact('light'); router.push(focus.route as Href); }}
      />

      <View style={{ gap: spacing.md }}>
        <Text variant="heading">{t('vp.overview')}</Text>
        {loading ? (
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Skel w="31%" h={110} /><Skel w="31%" h={110} /><Skel w="31%" h={110} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <DashMetric icon="people-outline" label={t('plat.students')} value={totalStudents} />
            <DashMetric icon="school-outline" label={t('ops.classesToday')} value={classesToday} tone="info" />
            <DashMetric icon="id-card-outline" label={t('ops.teachersToday')} value={teachersToday} tone="accent" />
          </View>
        )}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="heading">{t('vp.quick')}</Text>
        <DashAction icon="calendar-outline" label={t('child.schedule')} route="/more/calendar" />
        <DashAction icon="people-outline" label={t('menu.students')} route="/more/students" />
        <DashAction icon="pulse-outline" label={t('menu.ops')} badge={conflicts} tone={conflicts > 0 ? 'danger' : 'primary'} route="/more/ops" />
        <DashAction icon="megaphone-outline" label={t('more.announcements')} route="/more/announcements" />
      </View>
    </View>
  );
}
