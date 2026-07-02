import { ActivityIndicator, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { transportApi, type TransportRoute } from '@/api/school';
import { Screen, Card } from '@/components/screen';
import { Text } from '@/components/text';
import { EmptyState } from '@/components/empty-state';
import { IconBadge } from '@/components/row';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function TransportScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const { data, isLoading, isError, refetch } = useQuery<TransportRoute | null>({
    queryKey: ['transport', 'my-route'],
    queryFn: transportApi.myRoute,
  });

  if (isLoading) {
    return (
      <Screen title={t('more.transport')} scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      </Screen>
    );
  }
  if (isError || !data) {
    return (
      <Screen title={t('more.transport')} scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="bus-outline"
            title={isError ? t('common.error') : t('more.noRoute')}
            subtitle={isError ? t('common.networkError') : undefined}
            actionTitle={isError ? t('common.retry') : undefined}
            onAction={isError ? () => refetch() : undefined}
          />
        </View>
      </Screen>
    );
  }

  const stops = Array.isArray(data.stops) ? data.stops : [];

  return (
    <Screen title={t('more.transport')}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <IconBadge icon="bus" color="info" bg="infoLight" size="lg" />
          <View style={{ flex: 1 }}>
            <Text variant="heading" numberOfLines={1}>
              {data.name}
            </Text>
            {data.vehicleNumber ? (
              <Text variant="caption" color="textMuted">
                {t('more.vehicle')}: {data.vehicleNumber}
              </Text>
            ) : null}
          </View>
        </View>
      </Card>

      {data.driverName ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <IconBadge icon="person-outline" color="primary" bg="primaryLight" />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{data.driverName}</Text>
              {data.driverPhone ? (
                <Text variant="caption" color="textMuted">
                  {data.driverPhone}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>
      ) : null}

      {stops.length > 0 ? (
        <Card padded={false}>
          {stops.map((stop, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.border }}>
              <Ionicons name="location-outline" size={18} color={theme.primary} />
              <Text variant="body" style={{ flex: 1 }}>
                {stop}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
