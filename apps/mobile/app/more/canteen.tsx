import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { canteenApi, type MenuDay } from '@/api/school';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { DataList } from '@/components/data-list';
import { IconBadge } from '@/components/row';
import { formatMoney } from '@/lib/format';
import { spacing } from '@/theme/tokens';

const MEAL_ICON: Record<string, string> = {
  breakfast: 'cafe-outline',
  lunch: 'restaurant-outline',
  snack: 'nutrition-outline',
  dinner: 'pizza-outline',
};

/** itemsJson erkin shaklda — massiv (string yoki {name}) yoki obyekt bo'lishi mumkin. */
function itemsToList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((it) =>
      typeof it === 'string' ? it : (it as { name?: string; title?: string })?.name ?? (it as { title?: string })?.title ?? JSON.stringify(it),
    );
  }
  if (raw && typeof raw === 'object') return Object.values(raw as Record<string, unknown>).map(String);
  return raw ? [String(raw)] : [];
}

export default function CanteenScreen() {
  const { t } = useTranslation();

  const query = useQuery<MenuDay[]>({
    queryKey: ['canteen', 'today'],
    queryFn: canteenApi.today,
  });

  return (
    <View style={{ flex: 1 }}>
      <DataList
        query={query}
        keyExtractor={(m) => m.id}
        emptyIcon="restaurant-outline"
        emptyTitle={t('canteen.empty')}
        renderItem={(meal) => {
          const items = itemsToList(meal.itemsJson);
          return (
            <Card>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <IconBadge icon={(MEAL_ICON[meal.mealType] ?? 'restaurant-outline') as never} color="warning" bg="warningLight" />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text variant="bodyStrong">{t(`canteen.meal.${meal.mealType}`, { defaultValue: meal.mealType })}</Text>
                    {meal.price ? <Text variant="caption" color="textSecondary">{formatMoney(meal.price)}</Text> : null}
                  </View>
                  {items.length ? (
                    items.map((it, i) => (
                      <Text key={i} variant="caption" color="textSecondary" style={{ marginTop: 3 }}>
                        • {it}
                      </Text>
                    ))
                  ) : (
                    <Text variant="caption" color="textMuted" style={{ marginTop: 3 }}>—</Text>
                  )}
                </View>
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}
