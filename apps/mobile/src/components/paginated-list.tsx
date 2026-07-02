import { type ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import type { UseInfiniteQueryResult } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { EmptyState } from './empty-state';
import { ListSkeleton } from './skeleton';
import { flattenPages, type Page } from '@/lib/use-paginated';
import { useTabBarSpace } from '@/lib/tab-space';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

interface Props<T> {
  query: UseInfiniteQueryResult<{ pages: Page<T>[] }, Error>;
  renderItem: (item: T) => ReactElement;
  keyExtractor: (item: T) => string;
  ListHeader?: ReactElement | null;
  emptyTitle?: string;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
}

export function PaginatedList<T>({ query, renderItem, keyExtractor, ListHeader, emptyTitle, emptyIcon }: Props<T>) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const bottomSpace = useTabBarSpace();
  const { data, isLoading, isError, refetch, isRefetching, hasNextPage, fetchNextPage, isFetchingNextPage } = query;
  const items = flattenPages<T>(data);

  if (isLoading) {
    return (
      <View style={{ flex: 1 }}>
        {ListHeader}
        <ListSkeleton />
      </View>
    );
  }
  if (isError) {
    return (
      <View style={{ flex: 1 }}>
        {ListHeader}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState icon="cloud-offline-outline" tone="danger" title={t('common.error')} subtitle={t('common.networkError')} actionTitle={t('common.retry')} onAction={() => refetch()} />
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={({ item }) => renderItem(item)}
      ListHeaderComponent={ListHeader}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: bottomSpace }}
      ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      onEndReachedThreshold={0.4}
      onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
      ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={theme.primary} style={{ marginVertical: spacing.lg }} /> : null}
      ListEmptyComponent={
        <View style={{ paddingVertical: spacing.xxxl * 2 }}>
          <EmptyState icon={emptyIcon ?? 'file-tray-outline'} title={emptyTitle ?? t('common.empty')} />
        </View>
      }
    />
  );
}
