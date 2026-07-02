import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { usersApi, type Person } from '@/api/admin';
import { usePaginated } from '@/lib/use-paginated';
import { Screen } from '@/components/screen';
import { SearchBar } from '@/components/search-bar';
import { PaginatedList } from '@/components/paginated-list';
import { Row } from '@/components/row';
import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { spacing } from '@/theme/tokens';

export default function UsersScreen() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const query = usePaginated<Person>(['users', debounced], (page) => usersApi.list(page, debounced || undefined));

  return (
    <Screen title={t('menu.users')} scroll={false}>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder={t('crud.search')} />
        </View>
        <PaginatedList
          query={query}
          keyExtractor={(p) => p.id}
          emptyIcon="person-circle-outline"
          emptyTitle={t('crud.noResults')}
          renderItem={(p) => {
            const name = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
            return (
              <Row
                leading={<Avatar name={name} uri={p.avatarUrl} size={44} />}
                title={name || p.email || '—'}
                subtitle={p.email || p.phone || ''}
                trailing={p.role ? <Badge label={t(`roles.${p.role}`, { defaultValue: p.role })} tone="primary" /> : undefined}
              />
            );
          }}
        />
      </View>
    </Screen>
  );
}
