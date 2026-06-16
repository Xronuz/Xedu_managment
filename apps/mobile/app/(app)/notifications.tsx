import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { notificationsApi, type AppNotification, type NotificationsResponse } from '@/api/notifications';
import { Screen } from '@/components/screen';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { EmptyState } from '@/components/empty-state';
import { ListSkeleton } from '@/components/skeleton';
import { IconBadge } from '@/components/row';
import { formatDateTime } from '@/lib/format';
import { useTabBarSpace } from '@/lib/tab-space';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import type { ThemeColors } from '@/theme/tokens';

const CAT: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: keyof ThemeColors; bg: keyof ThemeColors }> = {
  operational: { icon: 'briefcase-outline', color: 'info', bg: 'infoLight' },
  alert: { icon: 'warning-outline', color: 'danger', bg: 'dangerLight' },
  announcement: { icon: 'megaphone-outline', color: 'primary', bg: 'primaryLight' },
  message: { icon: 'chatbubble-ellipses-outline', color: 'info', bg: 'infoLight' },
  reminder: { icon: 'alarm-outline', color: 'warning', bg: 'warningLight' },
  system: { icon: 'settings-outline', color: 'textMuted', bg: 'bgSubtle' },
};

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const bottomSpace = useTabBarSpace();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(1),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const items = data?.data ?? [];
  const unread = data?.meta?.unreadCount ?? 0;

  const right =
    unread > 0 ? (
      <Pressable
        onPress={() => markAll.mutate()}
        hitSlop={8}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
      >
        <Ionicons name="checkmark-done" size={18} color={theme.primary} />
        <Text variant="caption" color="primary">
          {t('notifications.markAllRead')}
        </Text>
      </Pressable>
    ) : undefined;

  function renderItem(n: AppNotification) {
    const cat = CAT[n.category] ?? CAT.system;
    return (
      <Card onPress={n.isRead ? undefined : () => markRead.mutate(n.id)}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <IconBadge icon={cat.icon} color={cat.color} bg={cat.bg} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                {n.title}
              </Text>
              {!n.isRead ? (
                <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: theme.primary }} />
              ) : null}
            </View>
            <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }} numberOfLines={3}>
              {n.body}
            </Text>
            <Text variant="label" color="textMuted" style={{ marginTop: 6 }}>
              {formatDateTime(n.createdAt)}
            </Text>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Screen title={t('notifications.title')} right={right} scroll={false}>
      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
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
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => renderItem(item)}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: bottomSpace, gap: spacing.md, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: 'center', minHeight: 360 }}>
              <EmptyState icon="notifications-outline" title={t('notifications.empty')} subtitle={t('notifications.emptySub')} />
            </View>
          }
        />
      )}
    </Screen>
  );
}
