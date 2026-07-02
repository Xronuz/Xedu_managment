import { type ReactElement } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import type { UseQueryResult } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { EmptyState } from './empty-state';
import { ListSkeleton } from './skeleton';
import { useTabBarSpace } from '@/lib/tab-space';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

interface Props<T> {
  query: UseQueryResult<T[]>;
  renderItem: (item: T, index: number) => ReactElement;
  keyExtractor: (item: T, index: number) => string;
  ListHeader?: ReactElement | null;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
}

export function DataList<T>({
  query,
  renderItem,
  keyExtractor,
  ListHeader,
  emptyTitle,
  emptySubtitle,
  emptyIcon,
}: Props<T>) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const bottomSpace = useTabBarSpace();
  const { data, isLoading, isError, refetch, isRefetching } = query;

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
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="cloud-offline-outline"
          tone="danger"
          title={t('common.error')}
          subtitle={t('common.networkError')}
          actionTitle={t('common.retry')}
          onAction={() => refetch()}
        />
      </View>
    );
  }

  return (
    <FlatList
      data={data ?? []}
      keyExtractor={keyExtractor}
      renderItem={({ item, index }) => renderItem(item, index)}
      ListHeaderComponent={ListHeader}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: bottomSpace, gap: spacing.md, flexGrow: 1 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} colors={[theme.primary]} />
      }
      ListEmptyComponent={
        <View style={{ flex: 1, justifyContent: 'center', minHeight: 320 }}>
          <EmptyState
            icon={emptyIcon ?? 'file-tray-outline'}
            title={emptyTitle ?? t('common.empty')}
            subtitle={emptySubtitle}
          />
        </View>
      }
    />
  );
}
