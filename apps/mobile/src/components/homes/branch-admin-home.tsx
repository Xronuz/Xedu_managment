/**
 * BranchAdminHome (NEW — MOBILE_FOUNDATION_SPEC §5.3 H5).
 * Operatsion command center — filial kunlik ishlari.
 *
 * Focus: bugungi kritik operatsion holat (absent teachers, conflicts).
 * Metrics: jami o'quvchilar, bugungi davomat %, bugungi sinflar.
 * Quick: Attendance, Students, Payments, Classes, Announcements.
 *
 * Hech qachon: revenue analytics (Accountant), staff hiring (Director).
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
import { FocusBlock, DashMetric, DashAction, Skel, Surface } from '../dashboard-kit';
import { ErrorBanner } from '../error-banner';
import { ProgressRing } from '../progress-ring';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact } from '@/lib/haptics';

const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const UZ_DAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];

export function BranchAdminHome({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const now = new Date();
  const dateLabel = `${UZ_DAYS[now.getDay()]}, ${now.getDate()} ${UZ_MONTHS[now.getMonth()]}`;

  const opsQ = useQuery<OpsSummary>({ queryKey: ['ops', 'summary'], queryFn: opsApi.summary, retry: false });
  const pulseQ = useQuery<SchoolPulse>({ queryKey: ['insights', 'pulse'], queryFn: insightsApi.pulse, retry: false });
  const loading = opsQ.isLoading || pulseQ.isLoading;

  const critical = opsQ.data?.alerts.critical ?? 0;
  const absentTeachers = opsQ.data?.staff.teachersAbsent ?? 0;
  const classesToday = opsQ.data?.stats.totalClassesToday ?? 0;
  const pendingLeaves = opsQ.data?.staff.pendingLeaveRequests ?? 0;
  const totalStudents = pulseQ.data?.totalStudents ?? 0;
  const attendanceRate = pulseQ.data?.today.attendanceRate;

  const focus = critical > 0
    ? { tone: 'danger' as const, icon: 'alert-circle' as const, title: t('branchAdmin.focus.alerts', { n: critical }), subtitle: t('branchAdmin.focus.alertsSub'), route: '/more/ops' }
    : absentTeachers > 0
      ? { tone: 'warning' as const, icon: 'id-card-outline' as const, title: t('branchAdmin.focus.absent', { n: absentTeachers }), subtitle: t('branchAdmin.focus.absentSub'), route: '/more/staff' }
      : { tone: 'success' as const, icon: 'shield-checkmark' as const, title: t('branchAdmin.focus.allGood'), subtitle: t('branchAdmin.focus.allGoodSub'), route: '/more/ops' };

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={name || '?'} uri={avatarUrl} size={46} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>{name}</Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>{t('role.branch_admin')} · {dateLabel}</Text>
        </View>
        <NotifBell />
      </View>

      {opsQ.isError ? (
        <ErrorBanner message={t('ops.loadError')} onRetry={() => opsQ.refetch()} />
      ) : null}

      <FocusBlock
        label={t('branchAdmin.focusTitle')}
        tone={focus.tone}
        icon={focus.icon}
        title={focus.title}
        subtitle={focus.subtitle}
        loading={loading}
        onPress={() => { impact('light'); router.push(focus.route as Href); }}
      />

      <View style={{ gap: spacing.md }}>
        <Text variant="heading">{t('branchAdmin.overview')}</Text>

        {/* Davomat ringi — keng, animatsiyali */}
        <Surface onPress={() => { impact('light'); router.push('/more/ops' as Href); }} style={{ padding: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
          <ProgressRing size={72} strokeWidth={8} progress={(attendanceRate ?? 0) / 100} color={theme.primary} track={theme.primaryLight} glow>
            <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text }}>{loading ? '·' : attendanceRate != null ? `${attendanceRate}%` : '—'}</Text>
          </ProgressRing>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color="textMuted">{t('ins.todayAttendance')}</Text>
            <Text variant="title" style={{ marginTop: 2 }}>{loading ? '··' : attendanceRate != null ? `${attendanceRate}%` : '—'}</Text>
          </View>
        </Surface>

        {loading ? (
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Skel w="48%" h={110} /><Skel w="48%" h={110} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <DashMetric icon="people-outline" label={t('plat.students')} value={totalStudents} />
            <DashMetric icon="school-outline" label={t('ops.classesToday')} value={classesToday} tone="info" />
          </View>
        )}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="heading">{t('branchAdmin.quick')}</Text>
        <DashAction icon="checkmark-done-outline" label={t('teach.attendance')} badge={pendingLeaves} tone="warning" route="/more/ops" />
        <DashAction icon="people-outline" label={t('menu.students')} route="/more/students" />
        <DashAction icon="card-outline" label={t('fin.payments')} route="/more/payments" />
        <DashAction icon="school-outline" label={t('menu.classes')} route="/more/classes" />
        <DashAction icon="megaphone-outline" label={t('more.announcements')} route="/more/announcements" />
      </View>
    </View>
  );
}
