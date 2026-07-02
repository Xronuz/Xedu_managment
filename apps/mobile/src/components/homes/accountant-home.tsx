/**
 * AccountantHome (NEW — MOBILE_FOUNDATION_SPEC §5.3 H7).
 * Bugungi moliyaviy snapshot + payment operations.
 *
 * Focus: qarzdorlar yoki bugungi yig'im maqsadi.
 * Metrics: oylik daromad, qarzdorlar soni, faol lidlar.
 * Quick: Payments, Finance, Students, Fee structures.
 *
 * Hech qachon: payroll (Phase 2), fee structure management (Phase 2),
 * staff list (Director).
 */
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { financeApi, type FinanceReport } from '@/api/school';
import { insightsApi, type SchoolPulse } from '@/api/analytics';
import { Text } from '../text';
import { Avatar } from '../avatar';
import { NotifBell } from '../notif-bell';
import { FocusBlock, DashMetric, DashAction, Skel, Surface } from '../dashboard-kit';
import { ErrorBanner } from '../error-banner';
import { formatMoney } from '@/lib/format';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact } from '@/lib/haptics';

const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const UZ_DAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];

export function AccountantHome({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const now = new Date();
  const dateLabel = `${UZ_DAYS[now.getDay()]}, ${now.getDate()} ${UZ_MONTHS[now.getMonth()]}`;

  const finQ = useQuery<FinanceReport>({ queryKey: ['finance', 'report'], queryFn: financeApi.report, retry: false });
  const pulseQ = useQuery<SchoolPulse>({ queryKey: ['insights', 'pulse'], queryFn: insightsApi.pulse, retry: false });
  const loading = finQ.isLoading || pulseQ.isLoading;

  const monthlyPaid = finQ.data?.monthly?.paid ?? 0;
  const overdue = finQ.data?.overdue ?? 0;
  const debtorCount = finQ.data?.debtors?.length ?? 0;
  const debtAmount = pulseQ.data?.pendingDebt.amount ?? 0;

  const focus = debtorCount > 0
    ? { tone: 'warning' as const, icon: 'cash' as const, title: t('acc.focus.debt', { n: debtorCount }), subtitle: debtAmount > 0 ? formatMoney(debtAmount) : '', route: '/more/payments' }
    : overdue > 0
      ? { tone: 'danger' as const, icon: 'warning' as const, title: t('acc.focus.overdue', { n: overdue }), subtitle: t('acc.focus.overdueSub'), route: '/more/payments' }
      : { tone: 'success' as const, icon: 'shield-checkmark' as const, title: t('acc.focus.allGood'), subtitle: t('acc.focus.allGoodSub'), route: '/more/finance' };

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={name || '?'} uri={avatarUrl} size={46} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>{name}</Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>{t('role.accountant')} · {dateLabel}</Text>
        </View>
        <NotifBell />
      </View>

      {finQ.isError ? (
        <ErrorBanner message={t('acc.loadError')} onRetry={() => finQ.refetch()} />
      ) : null}

      <FocusBlock
        label={t('acc.focusTitle')}
        tone={focus.tone}
        icon={focus.icon}
        title={focus.title}
        subtitle={focus.subtitle}
        loading={loading}
        onPress={() => { impact('light'); router.push(focus.route as Href); }}
      />

      <View style={{ gap: spacing.md }}>
        <Text variant="heading">{t('acc.overview')}</Text>

        {/* Oylik daromad strip */}
        <Surface onPress={() => { impact('light'); router.push('/more/finance' as Href); }} style={{ padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ width: 44, height: 44, borderRadius: radius.lg, backgroundColor: theme.successLight, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="cash-outline" size={22} color={theme.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color="textMuted">{t('acc.monthCollected')}</Text>
            {loading ? <Skel w={120} h={18} /> : <Text variant="title" style={{ marginTop: 2 }} numberOfLines={1}>{monthlyPaid > 0 ? formatMoney(monthlyPaid) : '—'}</Text>}
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
        </Surface>

        {loading ? (
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Skel w="48%" h={110} /><Skel w="48%" h={110} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <DashMetric icon="people-outline" label={t('acc.debtors')} value={debtorCount} tone="danger" />
            <DashMetric icon="alert-circle-outline" label={t('acc.overdue')} value={overdue} tone="warning" />
          </View>
        )}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="heading">{t('acc.quick')}</Text>
        <DashAction icon="card-outline" label={t('fin.payments')} badge={debtorCount} tone="warning" route="/more/payments" />
        <DashAction icon="pie-chart-outline" label={t('more.finance')} route="/more/finance" />
        <DashAction icon="people-outline" label={t('menu.students')} route="/more/students" />
        <DashAction icon="pricetags-outline" label={t('menu.feeStructures')} route="/more/fee-structures" />
      </View>
    </View>
  );
}
