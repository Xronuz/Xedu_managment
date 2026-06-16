import { RefreshControl, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { studentApi } from '@/api/student';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { HeroCard } from '@/components/hero-card';
import { EmptyState } from '@/components/empty-state';
import { ListSkeleton } from '@/components/skeleton';
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

export default function MyCoinsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const balanceQuery = useQuery<{ coins: number }>({
    queryKey: ['student', 'coins', 'balance'],
    queryFn: studentApi.coinsBalance,
  });
  const historyQuery = useQuery<CoinTx[]>({
    queryKey: ['student', 'coins', 'history'],
    queryFn: studentApi.coinsHistory,
  });

  const loading = balanceQuery.isLoading || historyQuery.isLoading;
  const failed = balanceQuery.isError && historyQuery.isError;

  if (loading) return <ListSkeleton />;
  if (failed) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="cloud-offline-outline"
          tone="danger"
          title={t('common.error')}
          subtitle={t('common.networkError')}
          actionTitle={t('common.retry')}
          onAction={() => {
            balanceQuery.refetch();
            historyQuery.refetch();
          }}
        />
      </View>
    );
  }

  const history = historyQuery.data ?? [];

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      refreshControl={
        <RefreshControl
          refreshing={historyQuery.isRefetching}
          onRefresh={() => {
            balanceQuery.refetch();
            historyQuery.refetch();
          }}
          tintColor={theme.primary}
        />
      }
    >
      <HeroCard>
        <Text variant="caption" style={{ color: theme.onHeroMuted }}>
          {t('coins.balance')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 }}>
          <Ionicons name="medal" size={26} color={theme.accent} />
          <Text variant="display" style={{ color: theme.onHero }}>
            {balanceQuery.data?.coins ?? 0}
          </Text>
        </View>
      </HeroCard>

      {history.length === 0 ? (
        <View style={{ marginTop: spacing.xl }}>
          <EmptyState icon="receipt-outline" title={t('coins.empty')} />
        </View>
      ) : (
        history.map((tx) => {
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
