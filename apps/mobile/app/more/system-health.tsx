import { RefreshControl, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { healthApi, type HealthResult } from '@/api/platform';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { HeroCard } from '@/components/hero-card';
import { EmptyState } from '@/components/empty-state';
import { ListSkeleton } from '@/components/skeleton';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function SystemHealthScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  // Health 503 qaytarsa ham javob tanasi (details) bor — error.response.data'ni o'qiymiz.
  const query = useQuery<HealthResult>({
    queryKey: ['system', 'health'],
    queryFn: () =>
      healthApi.check().catch((err) => {
        const data = (err as AxiosError<HealthResult>).response?.data;
        if (data) return data;
        throw err;
      }),
    refetchInterval: 30000,
  });

  if (query.isLoading) return <ListSkeleton />;
  if (query.isError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="cloud-offline-outline"
          tone="danger"
          title={t('common.error')}
          subtitle={t('common.networkError')}
          actionTitle={t('common.retry')}
          onAction={() => query.refetch()}
        />
      </View>
    );
  }

  const result = query.data;
  const healthy = result?.status === 'ok';
  const services = { ...(result?.details ?? result?.info ?? {}), ...(result?.error ?? {}) };
  const entries = Object.entries(services);

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={theme.primary} />}
    >
      <HeroCard>
        <Text variant="caption" style={{ color: theme.onHeroMuted }}>
          {t('plat.overall')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 }}>
          <Ionicons name={healthy ? 'shield-checkmark' : 'warning'} size={26} color={healthy ? theme.accent : '#FFD27A'} />
          <Text variant="title" style={{ color: theme.onHero }}>
            {healthy ? t('plat.healthy') : t('plat.degraded')}
          </Text>
        </View>
      </HeroCard>

      {entries.map(([name, svc]) => {
        const up = svc.status === 'up';
        return (
          <Card key={name}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: up ? theme.success : theme.danger,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" style={{ textTransform: 'capitalize' }}>
                  {name.replace(/_/g, ' ')}
                </Text>
                {svc.message ? (
                  <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
                    {svc.message}
                  </Text>
                ) : null}
              </View>
              <Text variant="label" style={{ color: up ? theme.success : theme.danger }}>
                {up ? 'UP' : 'DOWN'}
              </Text>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}
