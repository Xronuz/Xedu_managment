/**
 * LibrarianHome (NEW — MOBILE_FOUNDATION_SPEC §5.3 H8).
 * Kutubxona operatsiyalari — kitob berish/qaytarish.
 *
 * Focus: muddati o'tgan kitoblar.
 * Metrics: faol ijaralar, bugungi qaytarmagan kitoblar soni.
 * Quick: Loans, Library catalog, Students.
 *
 * Eng sodda home — asosan search + issue/return.
 */
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { loansApi, type LibraryLoan } from '@/api/school';
import { Text } from '../text';
import { Avatar } from '../avatar';
import { NotifBell } from '../notif-bell';
import { FocusBlock, DashMetric, DashAction, Skel, Surface } from '../dashboard-kit';
import { ErrorBanner } from '../error-banner';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact } from '@/lib/haptics';

const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const UZ_DAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate).getTime();
  const now = Date.now();
  if (Number.isNaN(due) || now <= due) return 0;
  return Math.floor((now - due) / (1000 * 60 * 60 * 24));
}

export function LibrarianHome({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const now = new Date();
  const dateLabel = `${UZ_DAYS[now.getDay()]}, ${now.getDate()} ${UZ_MONTHS[now.getMonth()]}`;

  const loansQ = useQuery<LibraryLoan[]>({ queryKey: ['library', 'loans', 'active'], queryFn: loansApi.list, retry: false });
  const loading = loansQ.isLoading;

  const activeLoans = loansQ.data ?? [];
  const overdueLoans = activeLoans.filter((l) => !l.returnedAt && daysOverdue(l.dueDate) > 0);
  const overdueCount = overdueLoans.length;

  const focus = overdueCount > 0
    ? { tone: 'danger' as const, icon: 'warning' as const, title: t('lib.focus.overdue', { n: overdueCount }), subtitle: t('lib.focus.overdueSub'), route: '/more/loans' }
    : activeLoans.length > 0
      ? { tone: 'primary' as const, icon: 'book' as const, title: t('lib.focus.active', { n: activeLoans.length }), subtitle: t('lib.focus.activeSub'), route: '/more/loans' }
      : { tone: 'success' as const, icon: 'shield-checkmark' as const, title: t('lib.focus.allGood'), subtitle: t('lib.focus.allGoodSub'), route: '/more/library' };

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={name || '?'} uri={avatarUrl} size={46} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>{name}</Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>{t('role.librarian')} · {dateLabel}</Text>
        </View>
        <NotifBell />
      </View>

      {loansQ.isError ? (
        <ErrorBanner message={t('lib.loadError')} onRetry={() => loansQ.refetch()} />
      ) : null}

      <FocusBlock
        label={t('lib.focusTitle')}
        tone={focus.tone}
        icon={focus.icon}
        title={focus.title}
        subtitle={focus.subtitle}
        loading={loading}
        onPress={() => { impact('light'); router.push(focus.route as Href); }}
      />

      <View style={{ gap: spacing.md }}>
        <Text variant="heading">{t('lib.overview')}</Text>
        {loading ? (
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Skel w="48%" h={110} /><Skel w="48%" h={110} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <DashMetric icon="book-outline" label={t('lib.activeLoans')} value={activeLoans.length} />
            <DashMetric icon="alert-circle-outline" label={t('lib.overdue')} value={overdueCount} tone="danger" />
          </View>
        )}

        {/* So'nggi ijaralar preview */}
        {!loading && activeLoans.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="label" color="textMuted">{t('lib.recentLoans').toUpperCase()}</Text>
            <Surface style={{ padding: spacing.md, gap: spacing.sm }}>
              {activeLoans.slice(0, 3).map((loan) => {
                const overdue = !loan.returnedAt && daysOverdue(loan.dueDate) > 0;
                const studentName = [loan.student?.firstName, loan.student?.lastName].filter(Boolean).join(' ');
                return (
                  <View key={loan.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <View style={{ width: 32, height: 32, borderRadius: radius.md, backgroundColor: overdue ? theme.dangerLight : theme.bgSubtle, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={overdue ? 'warning' : 'book-outline'} size={16} color={overdue ? theme.danger : theme.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong" numberOfLines={1}>{loan.book?.title ?? t('lib.unknownBook')}</Text>
                      <Text variant="caption" color="textMuted" numberOfLines={1}>{studentName}</Text>
                    </View>
                    {overdue ? (
                      <Text variant="label" style={{ color: theme.danger }}>{t('lib.overdueDays', { n: daysOverdue(loan.dueDate) })}</Text>
                    ) : null}
                  </View>
                );
              })}
            </Surface>
          </View>
        ) : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="heading">{t('lib.quick')}</Text>
        <DashAction icon="book-outline" label={t('more.loans')} badge={overdueCount} tone="danger" route="/more/loans" />
        <DashAction icon="library-outline" label={t('more.library')} route="/more/library" />
      </View>
    </View>
  );
}
