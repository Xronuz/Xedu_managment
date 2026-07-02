import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { platformApi, type SchoolItem, type PlatformStats } from '@/api/platform';
import { usePaginated } from '@/lib/use-paginated';
import { Screen } from '@/components/screen';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { SearchBar } from '@/components/search-bar';
import { PaginatedList } from '@/components/paginated-list';
import { Row } from '@/components/row';
import { IconBadge } from '@/components/row';
import { Badge } from '@/components/badge';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

function StatBlock({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text variant="title">{value}</Text>
      <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

export default function SchoolsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const statsQuery = useQuery<PlatformStats>({ queryKey: ['platform', 'stats'], queryFn: platformApi.stats });
  const query = usePaginated<SchoolItem>(['schools', debounced], (page) => platformApi.schools(page, debounced || undefined));

  const s = statsQuery.data;
  const header = (
    <View style={{ marginBottom: spacing.md }}>
      <Card>
        <View style={{ flexDirection: 'row' }}>
          <StatBlock value={s?.schoolCount ?? 0} label={t('plat.schools')} />
          <StatBlock value={s?.userCount ?? 0} label={t('plat.users')} />
          <StatBlock value={s?.activeSubscriptions ?? 0} label={t('plat.activeSubs')} />
        </View>
      </Card>
    </View>
  );

  return (
    <Screen title={t('menu.schools')} scroll={false}>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder={t('crud.search')} />
        </View>
        <PaginatedList
          query={query}
          ListHeader={header}
          keyExtractor={(c) => c.id}
          emptyIcon="business-outline"
          emptyTitle={t('plat.noSchools')}
          renderItem={(school) => {
            const counts = `${school._count?.users ?? 0} ${t('plat.users')} · ${school._count?.classes ?? 0} ${t('plat.classes')}`;
            const suspended = school.isActive === false;
            return (
              <Row
                leading={<IconBadge icon="business-outline" color={suspended ? 'textMuted' : 'primary'} bg={suspended ? 'cardElevated' : 'primaryLight'} />}
                title={school.name}
                subtitle={counts}
                trailing={
                  suspended ? (
                    <Badge label={t('plat.suspended')} tone="danger" />
                  ) : school.subscription?.status ? (
                    <Badge label={school.subscription.status} tone="primary" />
                  ) : (
                    <Ionicons name="ellipse" size={10} color={theme.success} />
                  )
                }
              />
            );
          }}
        />
      </View>
    </Screen>
  );
}
