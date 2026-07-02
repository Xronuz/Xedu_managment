import { Alert, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { shopAdminApi, type ShopItem } from '@/api/academic';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { DataList } from '@/components/data-list';
import { Badge } from '@/components/badge';
import { Fab } from '@/components/fab';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function ShopAdminScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();

  const query = useQuery<ShopItem[]>({
    queryKey: ['shop', 'admin'],
    queryFn: shopAdminApi.list,
  });

  const remove = useMutation({
    mutationFn: (id: string) => shopAdminApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shop', 'admin'] }),
    onError: () => Alert.alert(t('common.error'), t('common.networkError')),
  });

  const confirmDelete = (item: ShopItem) => {
    Alert.alert(item.name, t('shopA.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => remove.mutate(item.id) },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <DataList
        query={query}
        keyExtractor={(i) => i.id}
        emptyIcon="bag-handle-outline"
        emptyTitle={t('shopA.empty')}
        renderItem={(item) => (
          <Card onPress={() => confirmDelete(item)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {item.emoji ? `${item.emoji} ` : ''}{item.name}
                </Text>
                {item.description ? (
                  <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }} numberOfLines={1}>
                    {item.description}
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 }}>
                  <Ionicons name="medal-outline" size={15} color={theme.accent} />
                  <Text variant="label" style={{ color: theme.accent }}>{item.cost}</Text>
                  <Text variant="label" color="textMuted">
                    · {item.stock != null ? `${item.stock} ${t('special.stock')}` : '∞'}
                  </Text>
                </View>
              </View>
              {item.isActive === false ? <Badge label={t('crud.inactive')} tone="neutral" /> : null}
              <Ionicons name="trash-outline" size={20} color={theme.danger} />
            </View>
          </Card>
        )}
      />
      <Fab icon="add" onPress={() => router.push('/more/shop-admin-new' as Href)} />
    </View>
  );
}
