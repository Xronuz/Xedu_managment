import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { kpiApi, type TeacherKpi } from '@/api/school';
import { Screen, Card } from '@/components/screen';
import { Text } from '@/components/text';
import { StatCard } from '@/components/stat-card';
import { EmptyState } from '@/components/empty-state';
import { IconBadge } from '@/components/row';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function KpiScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<TeacherKpi>({
    queryKey: ['kpi', 'me'],
    queryFn: kpiApi.myPoints,
  });

  if (isLoading) {
    return (
      <Screen title={t('more.kpi')} scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      </Screen>
    );
  }
  if (isError || !data) {
    return (
      <Screen title={t('more.kpi')} scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState icon="cloud-offline-outline" tone="danger" title={t('common.error')} subtitle={t('common.networkError')} actionTitle={t('common.retry')} onAction={() => refetch()} />
        </View>
      </Screen>
    );
  }

  const points = data.points ?? [];

  return (
    <Screen title={t('more.kpi')} scroll={false}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
      >
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <StatCard icon="trophy" value={data.total ?? 0} label={t('more.totalPoints')} color={theme.accent} tint={theme.accentLight} />
          <StatCard icon="trending-up" value={data.thisMonth ?? 0} label={t('more.thisMonth')} color={theme.success} tint={theme.successLight} />
        </View>

        {points.length === 0 ? (
          <View style={{ marginTop: spacing.xl }}>
            <EmptyState icon="ribbon-outline" title={t('more.noKpi')} />
          </View>
        ) : (
          points.map((p) => (
            <Card key={p.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <IconBadge icon="star-outline" color="accent" bg="accentLight" />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={2}>
                    {p.title}
                  </Text>
                  {p.category ? (
                    <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
                      {p.category}
                    </Text>
                  ) : null}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="add" size={14} color={theme.success} />
                  <Text variant="bodyStrong" style={{ color: theme.success }}>
                    {p.points}
                  </Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
