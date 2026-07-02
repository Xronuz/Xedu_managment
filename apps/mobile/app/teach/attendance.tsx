import { useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { teacherApi, type AttendanceEntry } from '@/api/teacher';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/ui';
import { EmptyState } from '@/components/empty-state';
import { ListSkeleton } from '@/components/skeleton';
import { ErrorBanner } from '@/components/error-banner';
import { SegmentedControl } from '@/components/segmented-control';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact, success as hapticSuccess, error as hapticError } from '@/lib/haptics';

interface Student {
  id: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
}

type Status = AttendanceEntry['status'];

const SEGMENTS = [
  { value: 'present' as const, label: 'present' },
  { value: 'absent' as const, label: 'absent' },
  { value: 'late' as const, label: 'late' },
  { value: 'excused' as const, label: 'excused' },
];

export default function TeachAttendanceScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { classId, className, scheduleId } = useLocalSearchParams<{ classId: string; className?: string; scheduleId?: string }>();

  const [statuses, setStatuses] = useState<Record<string, Status>>({});

  const query = useQuery<Student[]>({
    queryKey: ['teacher', 'roster', classId],
    queryFn: () => teacherApi.classStudents(classId),
    enabled: !!classId,
  });

  const rawData: any = query.data;
  const students: Student[] = Array.isArray(rawData) ? rawData : rawData?.data ?? rawData?.items ?? [];

  // Roster yuklanganda barchani 'present' qilib boshlaymiz.
  useEffect(() => {
    if (students.length > 0) {
      setStatuses((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const init: Record<string, Status> = {};
        students.forEach((s) => (init[s.id] = 'present'));
        return init;
      });
    }
  }, [students]);

  const mutation = useMutation({
    mutationFn: () => {
      const today = new Date().toISOString().slice(0, 10);
      const entries: AttendanceEntry[] = students.map((s) => ({
        studentId: s.id,
        status: statuses[s.id] ?? 'present',
      }));
      return teacherApi.markAttendance({ classId, date: today, scheduleId, entries });
    },
    onSuccess: () => {
      hapticSuccess();
      Alert.alert(t('common.success'), t('teach.attendanceSaved'), [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: () => {
      hapticError();
      Alert.alert(t('common.error'), t('common.networkError'));
    },
  });

  // Quick-stat counts (optimistic UI feedback).
  const presentCount = Object.values(statuses).filter((s) => s === 'present').length;
  const absentCount = Object.values(statuses).filter((s) => s === 'absent').length;
  const lateCount = Object.values(statuses).filter((s) => s === 'late').length;

  function setStudent(id: string, status: Status) {
    impact('light');
    // Optimistic update — darhol UI yangilanadi (§4.8 pattern).
    setStatuses((p) => ({ ...p, [id]: status }));
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: className || t('teach.markAttendance') }} />

      {/* Quick stat strip */}
      {students.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
          <StatChip color={theme.success} bg={theme.successLight} label={t('attendance.present')} value={presentCount} />
          <StatChip color={theme.danger} bg={theme.dangerLight} label={t('attendance.absent')} value={absentCount} />
          <StatChip color={theme.warning} bg={theme.warningLight} label={t('attendance.late')} value={lateCount} />
        </View>
      ) : null}

      {query.isError ? (
        <View style={{ padding: spacing.lg }}>
          <ErrorBanner message={t('common.networkError')} onRetry={() => query.refetch()} />
        </View>
      ) : null}

      {query.isLoading ? (
        <ListSkeleton rows={5} />
      ) : students.length > 0 ? (
        <FlatList
          data={students}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: 96 }}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} tintColor={theme.primary} />
          }
          renderItem={({ item }) => {
            const current = statuses[item.id] ?? 'present';
            return (
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <Avatar name={`${item.firstName ?? ''} ${item.lastName ?? ''}`} uri={item.avatarUrl} size={38} />
                  <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                    {item.firstName} {item.lastName}
                  </Text>
                </View>
                {/* Segmented status control (Week 6 — segmented) */}
                <SegmentedControl
                  segments={SEGMENTS.map((s) => ({ value: s.value, label: t(`attendance.${s.label}`) }))}
                  value={current}
                  onChange={(val) => setStudent(item.id, val)}
                  style={{ marginTop: spacing.md }}
                />
              </Card>
            );
          }}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState icon="people-outline" title={t('teach.noStudents')} />
        </View>
      )}

      {/* Fixed bottom save button */}
      {students.length > 0 ? (
        <View style={{ position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.xl }}>
          <Button title={t('common.save')} icon="save-outline" onPress={() => mutation.mutate()} loading={mutation.isPending} />
        </View>
      ) : null}
    </View>
  );
}

function StatChip({ color, bg, label, value }: { color: string; bg: string; label: string; value: number }) {
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: bg, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md }}>
      <Text variant="bodyStrong" style={{ color }}>{value}</Text>
      <Text variant="label" style={{ color, fontSize: 11 }} numberOfLines={1}>{label}</Text>
    </View>
  );
}
