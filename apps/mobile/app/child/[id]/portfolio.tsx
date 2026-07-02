import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { portfolioApi, type AchievementItem } from '@/api/school';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { DataList } from '@/components/data-list';
import { IconBadge } from '@/components/row';
import { Badge } from '@/components/badge';
import { useChildParams } from '@/hooks/use-child';
import { formatDate } from '@/lib/format';
import { spacing } from '@/theme/tokens';

export default function ChildPortfolioScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useChildParams();

  const query = useQuery<AchievementItem[]>({
    queryKey: ['portfolio', id],
    queryFn: () => portfolioApi.forStudent(id),
    enabled: !!id,
  });

  return (
    <DataList
      query={query}
      keyExtractor={(a) => a.id}
      emptyIcon="ribbon-outline"
      emptyTitle={t('more.noPortfolio')}
      renderItem={(a) => {
        const cat = a.category && i18n.exists(`portfolioCategory.${a.category}`) ? t(`portfolioCategory.${a.category}`) : a.category;
        const level = a.level && i18n.exists(`portfolioLevel.${a.level}`) ? t(`portfolioLevel.${a.level}`) : a.level;
        return (
          <Card>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <IconBadge icon="ribbon-outline" color="accent" bg="accentLight" />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={2}>
                    {a.title}
                  </Text>
                  {level ? <Badge label={level} tone="primary" /> : null}
                </View>
                <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                  {[cat, a.issuer].filter(Boolean).join(' · ')}
                </Text>
                {a.description ? (
                  <Text variant="caption" color="textMuted" style={{ marginTop: 4 }} numberOfLines={2}>
                    {a.description}
                  </Text>
                ) : null}
                <Text variant="label" color="textMuted" style={{ marginTop: 6 }}>
                  {formatDate(a.createdAt)}
                </Text>
              </View>
            </View>
          </Card>
        );
      }}
    />
  );
}
