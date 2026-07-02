import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { parentApi } from '@/api/parent';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { EmptyState } from '@/components/empty-state';
import { ListSkeleton } from '@/components/skeleton';
import { useChildParams } from '@/hooks/use-child';
import { DAY_ORDER } from '@/lib/format';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

interface Lesson {
  id: string;
  dayOfWeek: string;
  timeSlot: number;
  startTime?: string;
  endTime?: string;
  subject?: { name?: string; teacher?: { id?: string; firstName?: string; lastName?: string } | null } | null;
}

export default function ScheduleScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useChildParams();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<Lesson[]>({
    queryKey: ['parent', 'schedule', id],
    queryFn: () => parentApi.getChildSchedule(id),
  });

  if (isLoading) return <ListSkeleton />;
  if (isError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState icon="cloud-offline-outline" tone="danger" title={t('common.error')} subtitle={t('common.networkError')} actionTitle={t('common.retry')} onAction={() => refetch()} />
      </View>
    );
  }

  const lessons = data ?? [];
  const byDay = DAY_ORDER.map((day) => ({
    day,
    items: lessons.filter((l) => l.dayOfWeek === day).sort((a, b) => a.timeSlot - b.timeSlot),
  })).filter((g) => g.items.length > 0);

  if (byDay.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState icon="calendar-outline" title={t('schedule.empty')} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
    >
      {byDay.map((group) => (
        <View key={group.day} style={{ gap: spacing.sm }}>
          <Text variant="label" color="primary" style={{ marginLeft: spacing.xs }}>
            {t(`schedule.${group.day}`).toUpperCase()}
          </Text>
          <Card padded={false}>
            {group.items.map((lesson, i) => (
              <View
                key={lesson.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.lg,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: theme.border,
                }}
              >
                <View
                  style={{
                    width: 46,
                    alignItems: 'center',
                    paddingVertical: spacing.xs,
                    backgroundColor: theme.primaryLight,
                    borderRadius: radius.sm,
                  }}
                >
                  <Text variant="caption" style={{ color: theme.primary, fontFamily: fonts.bold }}>
                    {lesson.startTime ?? `${lesson.timeSlot}`}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {lesson.subject?.name ?? '—'}
                  </Text>
                  {lesson.subject?.teacher ? (
                    <Text variant="caption" color="textMuted" numberOfLines={1} style={{ marginTop: 2 }}>
                      {lesson.subject.teacher.firstName} {lesson.subject.teacher.lastName}
                    </Text>
                  ) : null}
                </View>
                {lesson.subject?.teacher?.id ? (
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/chat/[userId]',
                        params: {
                          userId: lesson.subject!.teacher!.id!,
                          name: `${lesson.subject!.teacher!.firstName ?? ''} ${lesson.subject!.teacher!.lastName ?? ''}`.trim(),
                        },
                      })
                    }
                    hitSlop={8}
                    style={{ width: 36, height: 36, borderRadius: radius.pill, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color={theme.primary} />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </Card>
        </View>
      ))}
    </ScrollView>
  );
}
