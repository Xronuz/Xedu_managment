import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { demoApi, type DemoRequest, type DemoStatus } from '@/api/platform';
import { usePaginated } from '@/lib/use-paginated';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Row } from '@/components/row';
import { Badge } from '@/components/badge';
import { PaginatedList } from '@/components/paginated-list';
import { formatDate } from '@/lib/format';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const STATUSES: DemoStatus[] = ['new', 'contacted', 'scheduled', 'completed', 'rejected'];
const TONE: Record<DemoStatus, 'primary' | 'warning' | 'info' | 'success' | 'danger'> = {
  new: 'info',
  contacted: 'warning',
  scheduled: 'primary',
  completed: 'success',
  rejected: 'danger',
};

export default function DemoRequestsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<DemoStatus | undefined>(undefined);

  const statsQuery = useQuery<Record<string, number>>({ queryKey: ['demo', 'stats'], queryFn: demoApi.stats });
  const query = usePaginated<DemoRequest>(['demo', filter ?? 'all'], (page) => demoApi.list(page, filter));

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: DemoStatus }) => demoApi.update(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['demo'] });
    },
    onError: () => Alert.alert(t('common.error'), t('common.networkError')),
  });

  const changeStatus = (item: DemoRequest) => {
    Alert.alert(
      `${item.firstName} ${item.lastName}`,
      t('plat.setStatus'),
      [
        ...STATUSES.map((st) => ({ text: t(`plat.demoStatus.${st}`), onPress: () => mutation.mutate({ id: item.id, status: st }) })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ],
    );
  };

  const chips = (
    <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        {[undefined, ...STATUSES].map((st) => {
          const active = filter === st;
          const label = st ? `${t(`plat.demoStatus.${st}`)}${statsQuery.data?.[st] ? ` ${statsQuery.data[st]}` : ''}` : t('plat.all');
          return (
            <Pressable
              key={st ?? 'all'}
              onPress={() => setFilter(st)}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radius.pill,
                backgroundColor: active ? theme.primary : theme.card,
                borderWidth: 1,
                borderColor: active ? theme.primary : theme.border,
              }}
            >
              <Text variant="label" style={{ color: active ? theme.onPrimary : theme.textSecondary }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <Screen title={t('menu.demoRequests')} scroll={false}>
      <View style={{ flex: 1 }}>
        {chips}
        <PaginatedList
          query={query}
          keyExtractor={(d) => d.id}
          emptyIcon="mail-unread-outline"
          emptyTitle={t('plat.noDemo')}
          renderItem={(item) => (
            <Row
              onPress={() => changeStatus(item)}
              title={`${item.firstName} ${item.lastName}`}
              subtitle={`${item.institution} · ${formatDate(item.createdAt)}`}
              trailing={<Badge label={t(`plat.demoStatus.${item.status}`)} tone={TONE[item.status]} />}
            />
          )}
        />
      </View>
    </Screen>
  );
}
