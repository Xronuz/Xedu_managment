import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { studentApi } from '@/api/student';
import { useAuthStore } from '@/store/auth.store';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { SegmentedControl } from '@/components/segmented-control';
import { Skel, Surface } from '@/components/dashboard-kit';
import { useTabBarSpace } from '@/lib/tab-space';
import { ErrorBanner } from '@/components/error-banner';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { Ionicons } from '@expo/vector-icons';
import { lessonStateAt } from '@/lib/gamify';

interface Lesson {
  id: string;
  timeSlot?: number;
  startTime?: string;
  endTime?: string;
  dayOfWeek?: number;
  subject?: { name?: string; teacher?: { firstName?: string; lastName?: string } | null } | null;
  class?: { name?: string } | null;
  room?: { name?: string } | null;
}

const DAY_LABELS_UZ = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];
type ViewMode = 'today' | 'week';

export default function ScheduleTab() {
  const { t } = useTranslation();
  const { theme, shadow } = useTheme();
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? '').toLowerCase().trim();
  const isStudent = role === 'student';
  const bottomSpace = useTabBarSpace();
  const [mode, setMode] = useState<ViewMode>('today');

  const todayQ = useQuery<Lesson[]>({
    queryKey: ['student', 'schedule', 'today'],
    queryFn: studentApi.scheduleToday,
    enabled: isStudent && mode === 'today',
    retry: false,
  });
  const weekQ = useQuery<Lesson[]>({
    queryKey: ['student', 'schedule', 'week'],
    queryFn: studentApi.scheduleWeek,
    enabled: isStudent && mode === 'week',
    retry: false,
  });

  const activeQ = mode === 'today' ? todayQ : weekQ;
  const rawData: any = activeQ.data;
  const lessons: Lesson[] = Array.isArray(rawData) ? rawData : rawData?.data ?? rawData?.items ?? [];
  const loading = activeQ.isLoading;
  const isError = activeQ.isError;

  const grouped = mode === 'week' ? groupByDay(lessons) : [{ day: -1, items: lessons }];

  const TimelineView = ({ dayItems }: { dayItems: Lesson[] }) => {
    return (
      <View style={{ gap: 0, paddingLeft: spacing.sm }}>
        {dayItems.map((l, i) => {
          // Haqiqiy vaqt bo'yicha holat — ilova endi yolg'on gapirmaydi.
          const state = lessonStateAt(l);
          const isDone = state === 'done';
          const isActive = state === 'active';
          const isFuture = state === 'upcoming';

          const dotColor = isDone ? theme.success : isActive ? theme.primary : theme.borderStrong;
          const time = l.startTime ?? (l.timeSlot != null ? `${7 + l.timeSlot}:00` : '');
          const subtitle = [
            l.subject?.teacher ? `${l.subject.teacher.firstName ?? ''} ${l.subject.teacher.lastName ?? ''}`.trim() : null,
            l.room?.name ? `${l.room.name}-xona` : null,
          ].filter(Boolean).join(' · ');

          return (
            <View key={l.id} style={{ flexDirection: 'row', opacity: isDone ? 0.6 : 1 }}>
              {/* Left rail */}
              <View style={{ width: 60, alignItems: 'center', paddingRight: spacing.md }}>
                <Text variant="label" style={{ color: isActive ? theme.primary : theme.textMuted, marginTop: 14 }}>
                  {time}
                </Text>
              </View>
              <View style={{ width: 24, alignItems: 'center' }}>
                <View
                  style={{
                    width: isActive ? 16 : 12,
                    height: isActive ? 16 : 12,
                    borderRadius: 8,
                    backgroundColor: dotColor,
                    marginTop: isActive ? 16 : 18,
                    borderWidth: 2,
                    borderColor: theme.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isDone && <Ionicons name="checkmark" size={8} color="#FFF" />}
                </View>
                {i !== dayItems.length - 1 && (
                  <View style={{ width: 2, flex: 1, backgroundColor: isDone ? theme.success : theme.border, marginTop: -1 }} />
                )}
              </View>
              {/* Card */}
              <View style={{ flex: 1, paddingBottom: spacing.lg, paddingLeft: spacing.md }}>
                <Surface style={{ padding: spacing.md, borderWidth: isActive ? 1.5 : 1, borderColor: isActive ? theme.primary : theme.border, backgroundColor: isActive ? theme.primaryLight : theme.card, ...shadow(isActive ? 2 : 0) }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <View style={{ width: 38, height: 38, borderRadius: radius.md, backgroundColor: isDone ? theme.successLight : isActive ? theme.primary : theme.bgSubtle, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={isDone ? "checkmark-done" : isActive ? "play" : "book"} size={20} color={isDone ? theme.success : isActive ? '#FFF' : theme.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong" numberOfLines={1}>{l.subject?.name ?? 'Fan'}</Text>
                      {subtitle ? <Text variant="caption" color="textMuted" numberOfLines={1} style={{ marginTop: 2 }}>{subtitle}</Text> : null}
                    </View>
                  </View>
                </Surface>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <Screen title={t('me.todaySchedule')} scroll={false}>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md, flex: 1 }}>
        <SegmentedControl
          segments={[
            { value: 'today', label: 'Bugun' },
            { value: 'week', label: 'Hafta' },
          ]}
          value={mode}
          onChange={(v) => setMode(v as ViewMode)}
        />

        {isError && <ErrorBanner message={t('common.networkError')} onRetry={() => activeQ.refetch()} />}

        {loading ? (
          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <Skel w="100%" h={80} />
            <Skel w="100%" h={80} />
            <Skel w="100%" h={80} />
          </View>
        ) : lessons.length > 0 ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: spacing.md, paddingBottom: bottomSpace + spacing.xxl }}>
            {mode === 'today' ? (
              <TimelineView dayItems={lessons} />
            ) : (
              <View style={{ gap: spacing.xl }}>
                {grouped.map(({ day, items }) => (
                  <View key={day} style={{ gap: spacing.sm }}>
                    <Text variant="heading" style={{ marginLeft: spacing.xs }}>
                      {day >= 0 ? DAY_LABELS_UZ[day] : 'Bugun'}
                    </Text>
                    <TimelineView dayItems={items} />
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
            <Surface style={{ padding: spacing.xxl, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bgSubtle }}>
              <Ionicons name="cafe-outline" size={48} color={theme.info} style={{ marginBottom: spacing.md }} />
              <Text variant="heading" style={{ fontSize: 20 }}>Bugun dam kuni</Text>
              <Text variant="body" color="textMuted" center style={{ marginTop: spacing.sm }}>
                Qo'shimcha XP uchun kutubxona yoki vazifalarni ko'rib chiqing.
              </Text>
            </Surface>
          </View>
        )}
      </View>
    </Screen>
  );
}

function groupByDay(lessons: Lesson[]): { day: number; items: Lesson[] }[] {
  const map = new Map<number, Lesson[]>();
  for (const l of lessons) {
    const day = l.dayOfWeek ?? 1;
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(l);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([day, items]) => ({
      day,
      items: items.sort((a, b) => (a.timeSlot ?? 0) - (b.timeSlot ?? 0)),
    }));
}
