import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { approvalsApi, type ApprovalItem } from '@/api/school';
import { Screen } from '@/components/screen';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { Avatar } from '@/components/avatar';
import { ActionSheet } from '@/components/action-sheet';
import { ListSkeleton } from '@/components/skeleton';
import { ErrorBanner } from '@/components/error-banner';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/badge';
import { formatDate } from '@/lib/format';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { success as hapticSuccess, error as hapticError, impact } from '@/lib/haptics';

export default function ApprovalsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const qc = useQueryClient();
  const [active, setActive] = useState<ApprovalItem | null>(null);

  const query = useQuery<ApprovalItem[]>({
    queryKey: ['approvals', 'pending'],
    queryFn: approvalsApi.pending,
    retry: false,
  });

  const review = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) => approvalsApi.review(id, action),
    onSuccess: () => {
      hapticSuccess();
      qc.invalidateQueries({ queryKey: ['approvals'] });
      setActive(null);
    },
    onError: () => {
      hapticError();
    },
  });

  const items = query.data ?? [];

  return (
    <Screen title={t('more.approvals')} subtitle={items.length > 0 ? `${items.length}` : undefined} scroll={false}>
      {query.isError ? (
        <View style={{ padding: spacing.lg }}>
          <ErrorBanner message={t('common.networkError')} onRetry={() => query.refetch()} />
        </View>
      ) : null}

      {query.isLoading ? (
        <ListSkeleton rows={3} />
      ) : items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} tintColor={theme.primary} />
          }
          renderItem={({ item: row }) => {
            const name = row.requester ? `${row.requester.firstName ?? ''} ${row.requester.lastName ?? ''}`.trim() : '—';
            return (
              <Card onPress={() => { impact('light'); setActive(row); }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <Avatar name={name} size={42} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{name}</Text>
                      <Badge label={row.requester?.role ?? ''} tone="neutral" />
                    </View>
                    <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
                      {formatDate(row.startDate)} – {formatDate(row.endDate)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
                </View>
                <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.sm }} numberOfLines={2}>
                  {row.reason}
                </Text>
              </Card>
            );
          }}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState icon="checkmark-done-circle-outline" title={t('more.noApprovals')} subtitle={t('more.noApprovalsSub')} />
        </View>
      )}

      {/* Approve/Reject action sheet */}
      <ActionSheet
        visible={!!active}
        title={active ? `${active.requester?.firstName ?? ''} ${active.requester?.lastName ?? ''}`.trim() : ''}
        onDismiss={() => setActive(null)}
        options={[
          {
            label: t('more.approve'),
            icon: 'checkmark-circle',
            tone: 'success',
            onPress: () => active && review.mutate({ id: active.id, action: 'approve' }),
          },
          {
            label: t('more.reject'),
            icon: 'close-circle',
            tone: 'danger',
            destructive: true,
            onPress: () => active && review.mutate({ id: active.id, action: 'reject' }),
          },
        ]}
      />
    </Screen>
  );
}
