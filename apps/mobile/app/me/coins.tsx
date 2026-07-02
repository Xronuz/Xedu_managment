import { RefreshControl, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { studentApi } from '@/api/student';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { EmptyState } from '@/components/empty-state';
import { ListSkeleton } from '@/components/skeleton';
import { formatDate } from '@/lib/format';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

interface CoinTx { id: string; amount: number; type: 'earn' | 'deduct'; reason?: string; createdAt: string }
interface ShopItem { id: string; name: string; emoji?: string | null; cost: number }

export default function TreasureScreen() {
  const { t } = useTranslation();
  const { theme, shadow } = useTheme();
  const router = useRouter();

  const balanceQ = useQuery<{ coins: number }>({ queryKey: ['student', 'coins', 'balance'], queryFn: studentApi.coinsBalance, retry: false });
  const historyQ = useQuery<CoinTx[]>({ queryKey: ['student', 'coins', 'history'], queryFn: studentApi.coinsHistory, retry: false });
  const shopQ = useQuery<ShopItem[]>({ queryKey: ['student', 'coins', 'shop'], queryFn: studentApi.shop, retry: false });

  const balance = balanceQ.data?.coins ?? 0;
  const history = historyQ.data ?? [];
  const shop = shopQ.data ?? [];

  if (balanceQ.isLoading) return <ListSkeleton />;

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl }}
      refreshControl={<RefreshControl refreshing={historyQ.isRefetching} onRefresh={() => { balanceQ.refetch(); historyQ.refetch(); shopQ.refetch(); }} tintColor={theme.primary} />}
    >
      {/* Xazina hero — oltin */}
      <LinearGradient
        colors={['#C77D11', '#9A610C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: radius.xxl, padding: spacing.xl, overflow: 'hidden', ...shadow(2) }}
      >
        <Ionicons name="diamond" size={110} color="rgba(255,255,255,0.10)" style={{ position: 'absolute', right: -10, top: -8 }} />
        <Text variant="caption" style={{ color: 'rgba(255,255,255,0.85)' }}>{t('coins.yourTreasure')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs }}>
          <Ionicons name="medal" size={34} color="#FFE7A8" />
          <Text style={{ color: '#fff', fontSize: 44, fontWeight: '800' }}>{balance}</Text>
        </View>
      </LinearGradient>

      {/* Do'kon preview — gorizontal */}
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="heading">{t('coins.shopPreview')}</Text>
          <Text variant="label" color="primary" onPress={() => router.push('/more/shop' as Href)}>{t('coins.seeAll')} →</Text>
        </View>
        {shopQ.isLoading ? (
          <Card><Text variant="caption" color="textMuted">…</Text></Card>
        ) : shop.length === 0 ? (
          <Card><Text variant="caption" color="textMuted">{t('special.noItems')}</Text></Card>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.lg }}>
            {shop.slice(0, 8).map((item) => {
              const afford = balance >= item.cost;
              return (
                <View key={item.id} style={{ width: 130, backgroundColor: theme.card, borderRadius: radius.xl, borderWidth: 1, borderColor: afford ? theme.accent + '55' : theme.border, padding: spacing.md, gap: spacing.sm, ...shadow(1), opacity: afford ? 1 : 0.7 }}>
                  <View style={{ width: 48, height: 48, borderRadius: radius.lg, backgroundColor: theme.accentLight, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 24 }}>{item.emoji || '🎁'}</Text>
                  </View>
                  <Text variant="bodyStrong" numberOfLines={2} style={{ minHeight: 38 }}>{item.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="medal" size={14} color={theme.accent} />
                    <Text variant="caption" style={{ color: afford ? theme.accent : theme.textMuted, fontWeight: '700' }}>{item.cost}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* So'nggi harakatlar */}
      <View style={{ gap: spacing.sm }}>
        <Text variant="heading">{t('coins.recent')}</Text>
        {historyQ.isLoading ? (
          <ListSkeleton rows={3} />
        ) : history.length === 0 ? (
          <EmptyState icon="sparkles-outline" title={t('coins.empty')} />
        ) : (
          history.map((tx) => {
            const earn = tx.type === 'earn';
            return (
              <Card key={tx.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View style={{ width: 40, height: 40, borderRadius: radius.lg, backgroundColor: earn ? theme.successLight : theme.bgSubtle, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={earn ? 'add' : 'cart'} size={20} color={earn ? theme.success : theme.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>{tx.reason ?? (earn ? t('coins.earn') : t('coins.deduct'))}</Text>
                    <Text variant="caption" color="textMuted">{formatDate(tx.createdAt)}</Text>
                  </View>
                  <Text variant="bodyStrong" style={{ color: earn ? theme.success : theme.text }}>
                    {earn ? '+' : '−'}{Math.abs(tx.amount)} 🪙
                  </Text>
                </View>
              </Card>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
