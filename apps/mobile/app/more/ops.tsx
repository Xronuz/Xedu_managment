import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { opsApi, type OpsSummary } from '@/api/analytics';
import { Screen, Card } from '@/components/screen';
import { Text } from '@/components/text';
import { StatCard } from '@/components/stat-card';
import { EmptyState } from '@/components/empty-state';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

function SectionRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text variant="body" color="textSecondary">{label}</Text>
      <Text variant="bodyStrong" style={{ color: color ?? theme.text }}>{value}</Text>
    </View>
  );
}

export default function OpsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<OpsSummary>({
    queryKey: ['ops', 'summary'],
    queryFn: opsApi.summary,
  });

  if (isLoading) {
    return (
      <Screen title={t('menu.ops')} scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      </Screen>
    );
  }
  if (isError || !data) {
    return (
      <Screen title={t('menu.ops')} scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState icon="cloud-offline-outline" tone="danger" title={t('common.error')} subtitle={t('common.networkError')} actionTitle={t('common.retry')} onAction={() => refetch()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen title={t('menu.ops')} scroll={false}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
      >
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <StatCard icon="school" value={data.stats.totalClassesToday} label={t('ops.classesToday')} color={theme.primary} tint={theme.primaryLight} />
          <StatCard icon="people" value={data.stats.totalTeachersToday} label={t('ops.teachersToday')} color={theme.info} tint={theme.infoLight} />
        </View>

        <Card>
          <Text variant="heading" style={{ marginBottom: spacing.xs }}>{t('ops.staff')}</Text>
          <SectionRow label={t('att.present')} value={data.staff.teachersPresent} color={theme.success} />
          <SectionRow label={t('att.absent')} value={data.staff.teachersAbsent} color={data.staff.teachersAbsent > 0 ? theme.danger : undefined} />
          <SectionRow label={t('ops.substituted')} value={data.staff.teachersSubstituted} />
          <SectionRow label={t('ops.pendingLeaves')} value={data.staff.pendingLeaveRequests} color={data.staff.pendingLeaveRequests > 0 ? theme.warning : undefined} />
        </Card>

        <Card>
          <Text variant="heading" style={{ marginBottom: spacing.xs }}>{t('ops.schedule')}</Text>
          <SectionRow label={t('ops.published')} value={data.schedule.publishedSlots} color={theme.success} />
          <SectionRow label={t('ops.draft')} value={data.schedule.draftSlots} />
          <SectionRow label={t('ops.conflicts')} value={data.schedule.conflicts} color={data.schedule.conflicts > 0 ? theme.danger : undefined} />
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
            <Ionicons name="warning-outline" size={18} color={theme.text} />
            <Text variant="heading">{t('menu.alerts')}</Text>
          </View>
          <SectionRow label={t('ops.critical')} value={data.alerts.critical} color={data.alerts.critical > 0 ? theme.danger : undefined} />
          <SectionRow label={t('ops.warning')} value={data.alerts.warning} color={data.alerts.warning > 0 ? theme.warning : undefined} />
          <SectionRow label={t('ops.info')} value={data.alerts.info} />
        </Card>
      </ScrollView>
    </Screen>
  );
}
