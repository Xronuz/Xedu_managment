import { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { libraryApi, type LibraryBook } from '@/api/school';
import { Screen } from '@/components/screen';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { DataList } from '@/components/data-list';
import { IconBadge } from '@/components/row';
import { Badge } from '@/components/badge';
import { Field } from '@/components/ui';
import { spacing } from '@/theme/tokens';

export default function LibraryScreen() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const query = useQuery<LibraryBook[]>({
    queryKey: ['library', 'books', search.trim()],
    queryFn: () => libraryApi.books(search.trim() || undefined),
  });

  return (
    <Screen title={t('more.library')} scroll={false}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xs }}>
        <Field label="" leftIcon="search-outline" value={search} onChangeText={setSearch} placeholder={t('more.searchBook')} autoCapitalize="none" />
      </View>
      <DataList
        query={query}
        keyExtractor={(b) => b.id}
        emptyIcon="library-outline"
        emptyTitle={t('more.noBooks')}
        renderItem={(book) => {
          const avail = book.copiesAvailable ?? 0;
          return (
            <Card>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <IconBadge icon="book-outline" color="primary" bg="primaryLight" />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={2}>
                    {book.title}
                  </Text>
                  {book.author ? (
                    <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                      {book.author}
                    </Text>
                  ) : null}
                </View>
                <Badge label={`${avail} ${t('more.available')}`} tone={avail > 0 ? 'success' : 'neutral'} />
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}
