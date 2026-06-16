import { RefreshControl, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { parentApi } from '@/api/parent';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { HeroCard } from '@/components/hero-card';
import { EmptyState } from '@/components/empty-state';
import { ListSkeleton } from '@/components/skeleton';
import { useChildParams } from '@/hooks/use-child';
import { formatDate } from '@/lib/format';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

interface CoinTx {
  id: string;
  amount: number;
  type: 'earn' | 'deduct';
  reason?: string;
  createdAt: string;
}
interface CoinsResponse {
  balance: number;
  rank: number;
  total: number;
  history: CoinTx[];
}

export default function CoinsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { id } = useChildParams();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<CoinsResponse>({
    queryKey: ['parent', 'coins', id],
    queryFn: () => parentApi.getChildCoins(id),
  });

  if (isLoading) return <ListSkeleton />;
  if (isError || !data) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState icon="cloud-offline-outline" tone="danger" title={t('common.error')} subtitle={t('common.networkError')} actionTitle={t('common.retry')} onAction={() => refetch()} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
    >
      <HeroCard>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" style={{ color: theme.onHeroMuted }}>
              {t('coins.balance')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 }}>
              <Ionicons name="medal" size={26} color={theme.accent} />
              <Text variant="display" style={{ color: theme.onHero }}>
                {data.balance}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
            <Text variant="caption" style={{ color: theme.onHeroMuted }}>
              {t('coins.rank')}
            </Text>
            <Text variant="title" style={{ color: theme.onHero }}>
              {data.rank}
              <Text variant="body" style={{ color: theme.onHeroMuted }}>
                {' '}/ {data.total}
              </Text>
            </Text>
          </View>
        </View>
      </HeroCard>

      {data.history.length === 0 ? (
        <View style={{ marginTop: spacing.xl }}>
          <EmptyState icon="receipt-outline" title={t('coins.empty')} />
        </View>
      ) : (
        data.history.map((tx) => {
          const earn = tx.type === 'earn';
          return (
            <Card key={tx.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.md,
                    backgroundColor: earn ? theme.successLight : theme.dangerLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={earn ? 'arrow-up' : 'arrow-down'} size={20} color={earn ? theme.success : theme.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {tx.reason ?? (earn ? t('coins.earn') : t('coins.deduct'))}
                  </Text>
                  <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
                    {formatDate(tx.createdAt)}
                  </Text>
                </View>
                <Text variant="bodyStrong" style={{ color: earn ? theme.success : theme.danger }}>
                  {earn ? '+' : '−'}
                  {Math.abs(tx.amount)}
                </Text>
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}
