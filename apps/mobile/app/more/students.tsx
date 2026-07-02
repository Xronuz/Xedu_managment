import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { studentsApi, type Person } from '@/api/admin';
import { usePaginated } from '@/lib/use-paginated';
import { Screen } from '@/components/screen';
import { SearchBar } from '@/components/search-bar';
import { PaginatedList } from '@/components/paginated-list';
import { Row } from '@/components/row';
import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { Fab } from '@/components/fab';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function StudentsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const query = usePaginated<Person>(['students', debounced], (page) => studentsApi.list(page, debounced || undefined));

  return (
    <Screen title={t('menu.students')} scroll={false}>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder={t('crud.search')} />
        </View>
        <PaginatedList
          query={query}
          keyExtractor={(p) => p.id}
          emptyIcon="people-outline"
          emptyTitle={t('crud.noStudents')}
          renderItem={(p) => {
            const name = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
            return (
              <Row
                onPress={() => router.push({ pathname: '/more/student', params: { id: p.id, name } })}
                leading={<Avatar name={name} uri={p.avatarUrl} size={44} />}
                title={name || '—'}
                subtitle={p.phone || p.email || ''}
                trailing={p.isActive === false ? <Badge label={t('crud.inactive')} tone="neutral" /> : <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />}
              />
            );
          }}
        />
        <Fab onPress={() => router.push('/more/student-new')} />
      </View>
    </Screen>
  );
}
