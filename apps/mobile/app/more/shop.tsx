import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { studentApi } from '@/api/student';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { HeroCard } from '@/components/hero-card';
import { EmptyState } from '@/components/empty-state';
import { ListSkeleton } from '@/components/skeleton';
import { Button } from '@/components/ui';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

interface CoinShopItem {
  id: string;
  name: string;
  description?: string;
  cost: number;
  stock?: number | null;
}

export default function ShopScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const qc = useQueryClient();

  const balanceQuery = useQuery<{ coins: number }>({
    queryKey: ['student', 'coins', 'balance'],
    queryFn: studentApi.coinsBalance,
  });
  const shopQuery = useQuery<CoinShopItem[]>({
    queryKey: ['student', 'coins', 'shop'],
    queryFn: studentApi.shop,
  });

  const balance = balanceQuery.data?.coins ?? 0;

  const mutation = useMutation({
    mutationFn: (itemId: string) => studentApi.spend(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', 'coins'] });
      Alert.alert(t('common.success'), t('special.bought'));
    },
    onError: (err) => {
      const msg = (err as AxiosError<{ message?: string | string[] }>).response?.data?.message;
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg.join('\n') : (msg as string) ?? t('common.networkError'));
    },
  });

  const confirmBuy = (item: CoinShopItem) => {
    Alert.alert(t('special.confirmBuy'), `${item.name} · ${item.cost} 🪙`, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('special.buy'), onPress: () => mutation.mutate(item.id) },
    ]);
  };

  if (shopQuery.isLoading) return <ListSkeleton />;
  if (shopQuery.isError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="cloud-offline-outline"
          tone="danger"
          title={t('common.error')}
          subtitle={t('common.networkError')}
          actionTitle={t('common.retry')}
          onAction={() => shopQuery.refetch()}
        />
      </View>
    );
  }

  const items = shopQuery.data ?? [];

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      refreshControl={
        <RefreshControl
          refreshing={shopQuery.isRefetching}
          onRefresh={() => {
            balanceQuery.refetch();
            shopQuery.refetch();
          }}
          tintColor={theme.primary}
        />
      }
    >
      <HeroCard>
        <Text variant="caption" style={{ color: theme.onHeroMuted }}>
          {t('special.balance')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 }}>
          <Ionicons name="medal" size={26} color={theme.accent} />
          <Text variant="display" style={{ color: theme.onHero }}>
            {balance}
          </Text>
        </View>
      </HeroCard>

      {items.length === 0 ? (
        <View style={{ marginTop: spacing.xl }}>
          <EmptyState icon="gift-outline" title={t('special.noItems')} />
        </View>
      ) : (
        items.map((item) => {
          const soldOut = item.stock != null && item.stock <= 0;
          const tooPoor = balance < item.cost;
          return (
            <Card key={item.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.description ? (
                    <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 }}>
                    <Ionicons name="medal-outline" size={15} color={theme.accent} />
                    <Text variant="label" style={{ color: theme.accent }}>
                      {item.cost} · {t('special.cost')}
                    </Text>
                    {item.stock != null ? (
                      <Text variant="label" color="textMuted">
                        · {item.stock} {t('special.stock')}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
              <View style={{ marginTop: spacing.md }}>
                <Button
                  title={soldOut ? t('special.outOfStock') : t('special.buy')}
                  icon="cart-outline"
                  variant="tonal"
                  onPress={() => confirmBuy(item)}
                  disabled={soldOut || tooPoor || mutation.isPending}
                />
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}
