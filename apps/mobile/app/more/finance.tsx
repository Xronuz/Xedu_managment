import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { financeApi, type FinanceReport } from '@/api/school';
import { Screen, Card } from '@/components/screen';
import { Text } from '@/components/text';
import { StatCard } from '@/components/stat-card';
import { DonutChart } from '@/components/charts';
import { EmptyState } from '@/components/empty-state';
import { IconBadge } from '@/components/row';
import { formatDate, formatMoney } from '@/lib/format';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function FinanceScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<FinanceReport>({
    queryKey: ['finance', 'report'],
    queryFn: financeApi.report,
  });

  if (isLoading) {
    return (
      <Screen title={t('more.finance')} scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      </Screen>
    );
  }
  if (isError || !data) {
    return (
      <Screen title={t('more.finance')} scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState icon="cloud-offline-outline" tone="danger" title={t('common.error')} subtitle={t('common.networkError')} actionTitle={t('common.retry')} onAction={() => refetch()} />
        </View>
      </Screen>
    );
  }

  const debtors = data.debtors ?? [];

  return (
    <Screen title={t('more.finance')} scroll={false}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
      >
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <StatCard icon="checkmark-circle" value={formatMoney(data.monthly?.paid ?? 0)} label={t('more.monthPaid')} color={theme.success} tint={theme.successLight} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <StatCard icon="time" value={formatMoney(data.pending ?? 0)} label={t('more.pending')} color={theme.warning} tint={theme.warningLight} />
          <StatCard icon="alert-circle" value={formatMoney(data.overdue ?? 0)} label={t('more.overdue')} color={theme.danger} tint={theme.dangerLight} />
        </View>

        {(data.monthly?.paid ?? 0) + (data.pending ?? 0) + (data.overdue ?? 0) > 0 ? (
          <Card>
            <DonutChart
              segments={[
                { value: data.monthly?.paid ?? 0, color: theme.success, label: t('more.monthPaid') },
                { value: data.pending ?? 0, color: theme.warning, label: t('more.pending') },
                { value: data.overdue ?? 0, color: theme.danger, label: t('more.overdue') },
              ]}
            />
          </Card>
        ) : null}

        <Text variant="heading" style={{ marginTop: spacing.sm }}>
          {t('more.debtors')}
        </Text>
        {debtors.length === 0 ? (
          <EmptyState icon="happy-outline" title={t('more.noDebtors')} />
        ) : (
          debtors.map((d) => {
            const name = d.student ? `${d.student.firstName ?? ''} ${d.student.lastName ?? ''}`.trim() : '—';
            return (
              <Card key={d.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <IconBadge icon="person-outline" color="danger" bg="dangerLight" />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {name}
                    </Text>
                    {d.dueDate ? (
                      <Text variant="caption" color="textMuted">
                        {t('more.dueDate')}: {formatDate(d.dueDate)}
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="bodyStrong" style={{ color: theme.danger }}>
                    {formatMoney(d.amount)}
                  </Text>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
