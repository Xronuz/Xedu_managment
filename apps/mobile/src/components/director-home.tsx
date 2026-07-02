import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { insightsApi, opsApi, type SchoolPulse, type OpsSummary } from '@/api/analytics';
import { Text } from './text';
import { Avatar } from './avatar';
import { NotifBell } from './notif-bell';
import { ProgressRing } from './progress-ring';
import { Surface, Skel, FocusBlock, DashMetric, DashAction, type DashTone } from './dashboard-kit';
import { ErrorBanner } from './error-banner';
import { formatMoney } from '@/lib/format';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact } from '@/lib/haptics';

const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const UZ_DAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];

export function DirectorHome({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();

  const pulseQ = useQuery<SchoolPulse>({ queryKey: ['insights', 'pulse'], queryFn: insightsApi.pulse, retry: false });
  const opsQ = useQuery<OpsSummary>({ queryKey: ['ops', 'summary'], queryFn: opsApi.summary, retry: false });
  const pulse = pulseQ.data;
  const ops = opsQ.data;
  const loading = pulseQ.isLoading || opsQ.isLoading;

  const now = new Date();
  const dateLabel = `${UZ_DAYS[now.getDay()]}, ${now.getDate()} ${UZ_MONTHS[now.getMonth()]}`;

  const critical = ops?.alerts.critical ?? 0;
  const warning = ops?.alerts.warning ?? 0;
  const approvals = ops?.staff.pendingLeaveRequests ?? 0;
  const absent = ops?.staff.teachersAbsent ?? 0;
  const debt = pulse?.pendingDebt.count ?? 0;
  const attRate = pulse?.today.attendanceRate;
  const revenue = pulse?.monthlyRevenue ?? 0;

  const focus: { tone: DashTone; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; route: string } = (() => {
    if (critical > 0) return { tone: 'danger', icon: 'alert-circle', title: t('dir.focus.alerts', { n: critical }), subtitle: t('dir.focus.alertsSub'), route: '/more/ops' };
    if (approvals > 0) return { tone: 'warning', icon: 'checkmark-done-circle', title: t('dir.focus.approvals', { n: approvals }), subtitle: t('dir.focus.approvalsSub'), route: '/more/approvals' };
    if (debt > 0) return { tone: 'warning', icon: 'cash', title: t('dir.focus.debt', { n: debt }), subtitle: t('dir.focus.debtSub'), route: '/more/insights' };
    return { tone: 'success', icon: 'shield-checkmark', title: t('dir.focus.allGood'), subtitle: t('dir.focus.allGoodSub'), route: '/more/ops' };
  })();

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={name || '?'} uri={avatarUrl} size={46} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>{name}</Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>{t('role.director')} · {dateLabel}</Text>
        </View>
        <NotifBell />
      </View>

      <FocusBlock label={t('dir.focusTitle')} tone={focus.tone} icon={focus.icon} title={focus.title} subtitle={focus.subtitle} loading={loading} onPress={() => { impact('light'); router.push(focus.route as Href); }} />

      {opsQ.isError ? (
        <ErrorBanner message={t('dir.loadError')} onRetry={() => opsQ.refetch()} />
      ) : null}

      <View style={{ gap: spacing.md }}>
        <Text variant="heading">{t('dir.overview')}</Text>

        {/* Davomat — keng, animatsiyali halqa */}
        <Surface onPress={() => { impact('light'); router.push('/more/ops' as Href); }} style={{ padding: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
          <ProgressRing size={72} strokeWidth={8} progress={(attRate ?? 0) / 100} color={theme.primary} track={theme.primaryLight} glow>
            <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text }}>{loading ? '·' : attRate != null ? `${attRate}%` : '—'}</Text>
          </ProgressRing>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color="textMuted">{t('ins.todayAttendance')}</Text>
            <Text variant="title" style={{ marginTop: 2 }}>{loading ? '··' : attRate != null ? `${attRate}%` : '—'}</Text>
            {ops ? <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }}>{ops.staff.teachersPresent} {t('att.present').toLowerCase()}</Text> : null}
          </View>
        </Surface>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <DashMetric icon="people-outline" label={t('plat.students')} value={loading ? null : pulse?.totalStudents ?? null} />
          <DashMetric icon="school-outline" label={t('plat.teachers')} value={loading ? null : pulse?.totalTeachers ?? null} tone="info" />
        </View>

        {/* Daromad strip */}
        <Surface onPress={() => { impact('light'); router.push('/more/insights' as Href); }} style={{ padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ width: 44, height: 44, borderRadius: radius.lg, backgroundColor: theme.successLight, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="cash-outline" size={22} color={theme.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color="textMuted">{t('ins.monthRevenue')}</Text>
            {loading ? <Skel w={120} h={18} /> : <Text variant="title" style={{ marginTop: 2 }} numberOfLines={1}>{revenue > 0 ? formatMoney(revenue) : '—'}</Text>}
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
        </Surface>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="heading">{t('dir.manage')}</Text>
        <DashAction icon="checkmark-done-outline" label={t('more.approvals')} badge={approvals} tone="warning" route="/more/approvals" />
        <DashAction icon="pulse-outline" label={t('menu.ops')} badge={critical + warning} tone={critical > 0 ? 'danger' : 'warning'} route="/more/ops" />
        <DashAction icon="id-card-outline" label={t('menu.staff')} badge={absent} tone="danger" route="/more/staff" />
        <DashAction icon="megaphone-outline" label={t('more.announcements')} route="/more/announcements" />
        <DashAction icon="calendar-outline" label={t('more.calendar')} route="/more/calendar" />
        <DashAction icon="settings-outline" label={t('menu.settings')} route="/more/settings" />
      </View>
    </View>
  );
}
