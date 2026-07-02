import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { insightsApi, type SchoolPulse } from '@/api/analytics';
import { Screen, Card } from '@/components/screen';
import { Text } from '@/components/text';
import { StatCard } from '@/components/stat-card';
import { DonutChart } from '@/components/charts';
import { EmptyState } from '@/components/empty-state';
import { formatMoney } from '@/lib/format';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function InsightsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<SchoolPulse>({
    queryKey: ['insights', 'pulse'],
    queryFn: insightsApi.pulse,
  });

  if (isLoading) {
    return (
      <Screen title={t('menu.insights')} scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      </Screen>
    );
  }
  if (isError || !data) {
    return (
      <Screen title={t('menu.insights')} scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState icon="cloud-offline-outline" tone="danger" title={t('common.error')} subtitle={t('common.networkError')} actionTitle={t('common.retry')} onAction={() => refetch()} />
        </View>
      </Screen>
    );
  }

  const today = data.today;
  const attTotal = today.present + today.absent + today.late;

  return (
    <Screen title={t('menu.insights')} scroll={false}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
      >
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <StatCard icon="people" value={data.totalStudents} label={t('plat.students')} color={theme.primary} tint={theme.primaryLight} />
          <StatCard icon="school" value={data.totalTeachers} label={t('plat.teachers')} color={theme.info} tint={theme.infoLight} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <StatCard icon="cash" value={formatMoney(data.monthlyRevenue)} label={t('ins.monthRevenue')} color={theme.success} tint={theme.successLight} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <StatCard icon="magnet" value={data.newLeadsThisWeek} label={t('ins.newLeads')} color={theme.accent} tint={theme.accentLight} />
          <StatCard icon="warning" value={data.openAlerts} label={t('menu.alerts')} color={theme.danger} tint={theme.dangerLight} />
        </View>

        <Card>
          <Text variant="heading" style={{ marginBottom: spacing.md }}>
            {t('ins.todayAttendance')}{today.attendanceRate != null ? ` · ${today.attendanceRate}%` : ''}
          </Text>
          {attTotal > 0 ? (
            <DonutChart
              segments={[
                { value: today.present, color: theme.success, label: t('att.present') },
                { value: today.late, color: theme.warning, label: t('att.late') },
                { value: today.absent, color: theme.danger, label: t('att.absent') },
              ]}
              centerLabel={t('ins.rate')}
              centerValue={today.attendanceRate != null ? `${today.attendanceRate}%` : '—'}
            />
          ) : (
            <EmptyState icon="calendar-outline" title={t('ins.noAttToday')} />
          )}
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text variant="bodyStrong">{t('ins.pendingDebt')}</Text>
              <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
                {data.pendingDebt.count} {t('fin.payments')}
              </Text>
            </View>
            <Text variant="title" style={{ color: theme.danger }}>
              {formatMoney(data.pendingDebt.amount)}
            </Text>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}
