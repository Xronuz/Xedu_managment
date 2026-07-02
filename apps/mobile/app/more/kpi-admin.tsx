import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { kpiDashboardApi, type KpiDashboard, type KpiStatus } from '@/api/analytics';
import { Screen, Card } from '@/components/screen';
import { Text } from '@/components/text';
import { HeroCard } from '@/components/hero-card';
import { Badge } from '@/components/badge';
import { EmptyState } from '@/components/empty-state';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const STATUS_TONE: Record<'good' | 'warn' | 'bad', 'success' | 'warning' | 'danger'> = {
  good: 'success',
  warn: 'warning',
  bad: 'danger',
};

export default function KpiAdminScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<KpiDashboard>({
    queryKey: ['kpi', 'dashboard'],
    queryFn: kpiDashboardApi.get,
  });

  if (isLoading) {
    return (
      <Screen title={t('menu.kpiAdmin')} scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      </Screen>
    );
  }
  if (isError || !data) {
    return (
      <Screen title={t('menu.kpiAdmin')} scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState icon="cloud-offline-outline" tone="danger" title={t('common.error')} subtitle={t('common.networkError')} actionTitle={t('common.retry')} onAction={() => refetch()} />
        </View>
      </Screen>
    );
  }

  const statusColor = (s: KpiStatus) => (s === 'good' ? theme.success : s === 'warn' ? theme.warning : s === 'bad' ? theme.danger : theme.textMuted);

  return (
    <Screen title={t('menu.kpiAdmin')} scroll={false}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
      >
        <HeroCard>
          <Text variant="caption" style={{ color: theme.onHeroMuted }}>
            {t('kpiD.overallScore')}
          </Text>
          <Text variant="display" style={{ color: theme.onHero, marginTop: 2 }}>
            {data.overallScore != null ? `${data.overallScore}%` : '—'}
          </Text>
          <Text variant="caption" style={{ color: theme.onHeroMuted, marginTop: 4 }}>
            {data.metrics.length} {t('kpiD.metrics')}
          </Text>
        </HeroCard>

        {data.metrics.length === 0 ? (
          <EmptyState icon="speedometer-outline" title={t('kpiD.noMetrics')} />
        ) : (
          data.metrics.map((m) => {
            const pct = m.progress != null ? Math.min(Math.round(m.progress), 100) : 0;
            return (
              <Card key={m.metricId}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                    {m.name}
                  </Text>
                  {m.awaitingValue ? (
                    <Badge label={t('kpiD.awaiting')} tone="neutral" />
                  ) : m.status ? (
                    <Badge label={`${pct}%`} tone={STATUS_TONE[m.status]} />
                  ) : null}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 }}>
                  <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
                    {m.latestValue != null ? `${m.latestValue}${m.unit ? ` ${m.unit}` : ''}` : '—'}
                    {m.targetValue != null ? ` / ${m.targetValue}${m.unit ? ` ${m.unit}` : ''}` : ''}
                  </Text>
                </View>
                {m.status ? (
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.border, marginTop: 8, overflow: 'hidden' }}>
                    <View style={{ width: `${pct}%`, height: 6, borderRadius: 3, backgroundColor: statusColor(m.status) }} />
                  </View>
                ) : null}
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
