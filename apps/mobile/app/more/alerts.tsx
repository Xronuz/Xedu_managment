import { useState } from 'react';
import { FlatList, Modal, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { alertsApi, type OpsAlert } from '@/api/school';
import { Screen } from '@/components/screen';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { IconBadge } from '@/components/row';
import { ChipFilter } from '@/components/chip-filter';
import { Button } from '@/components/ui';
import { ListSkeleton } from '@/components/skeleton';
import { ErrorBanner } from '@/components/error-banner';
import { EmptyState } from '@/components/empty-state';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { success as hapticSuccess, impact } from '@/lib/haptics';
import type { ThemeColors } from '@/theme/tokens';

type Filter = 'all' | 'critical' | 'warning' | 'info';

const SEV: Record<string, { icon: 'alert-circle' | 'warning' | 'information-circle'; color: keyof ThemeColors; bg: keyof ThemeColors }> = {
  critical: { icon: 'alert-circle', color: 'danger', bg: 'dangerLight' },
  warning: { icon: 'warning', color: 'warning', bg: 'warningLight' },
  info: { icon: 'information-circle', color: 'info', bg: 'infoLight' },
};

export default function AlertsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [active, setActive] = useState<OpsAlert | null>(null);

  const query = useQuery<OpsAlert[]>({
    queryKey: ['ops', 'alerts'],
    queryFn: alertsApi.list,
    retry: false,
  });
  const ack = useMutation({
    mutationFn: (id: string) => alertsApi.acknowledge(id),
    onSuccess: () => {
      hapticSuccess();
      qc.invalidateQueries({ queryKey: ['ops', 'alerts'] });
      setActive(null);
    },
  });

  const all = query.data ?? [];
  const counts = {
    all: all.length,
    critical: all.filter((a) => a.severity === 'critical').length,
    warning: all.filter((a) => a.severity === 'warning').length,
    info: all.filter((a) => a.severity === 'info').length,
  };
  const filtered = filter === 'all' ? all : all.filter((a) => a.severity === filter);

  return (
    <Screen title={t('menu.alerts')} scroll={false}>
      {/* Priority chip filter */}
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <ChipFilter
          selected={filter}
          onSelect={(v) => { impact('light'); setFilter(v as Filter); }}
          options={[
            { value: 'all', label: t('ops.critical') === 'Jiddiy' ? 'Hammasi' : 'Все', count: counts.all },
            { value: 'critical', label: t('ops.critical'), count: counts.critical, tone: 'danger' },
            { value: 'warning', label: t('ops.warning'), count: counts.warning, tone: 'warning' },
            { value: 'info', label: t('ops.info'), count: counts.info, tone: 'info' },
          ]}
        />
      </View>

      {query.isError ? (
        <View style={{ padding: spacing.lg }}>
          <ErrorBanner message={t('common.networkError')} onRetry={() => query.refetch()} />
        </View>
      ) : null}

      {query.isLoading ? (
        <ListSkeleton rows={4} />
      ) : filtered.length > 0 ? (
        <FlatList
          data={filtered}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} tintColor={theme.primary} />
          }
          renderItem={({ item: a }) => {
            const sev = SEV[a.severity] ?? SEV.info;
            return (
              <Card onPress={() => { impact('light'); setActive(a); }}>
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <IconBadge icon={sev.icon} color={sev.color} bg={sev.bg} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={2}>{a.title}</Text>
                    {a.message ? (
                      <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }} numberOfLines={2}>{a.message}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                </View>
              </Card>
            );
          }}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState icon="checkmark-done-circle-outline" title={t('menu.noAlerts')} subtitle={t('menu.noAlertsSub')} />
        </View>
      )}

      {/* Alert detail bottom sheet */}
      <Modal visible={!!active} animationType="slide" transparent onRequestClose={() => setActive(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }}>
            <View style={{ padding: spacing.xxl }}>
              {active ? (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <IconBadge
                        icon={(SEV[active.severity] ?? SEV.info).icon}
                        color={(SEV[active.severity] ?? SEV.info).color}
                        bg={(SEV[active.severity] ?? SEV.info).bg}
                      />
                      <Text variant="title" style={{ flex: 1 }} numberOfLines={2}>{active.title}</Text>
                    </View>
                    <Ionicons name="close" size={26} color={theme.textMuted} onPress={() => setActive(null)} />
                  </View>

                  {active.message ? (
                    <Text variant="body" style={{ lineHeight: 22, marginBottom: spacing.lg }}>{active.message}</Text>
                  ) : null}

                  <Button
                    title={t('menu.acknowledge')}
                    icon="checkmark-outline"
                    variant="tonal"
                    loading={ack.isPending}
                    onPress={() => active && ack.mutate(active.id)}
                    fullWidth
                  />
                </>
              ) : null}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </Screen>
  );
}
