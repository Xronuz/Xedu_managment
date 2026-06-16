import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { teacherApi, type AttendanceEntry } from '@/api/teacher';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/ui';
import { EmptyState } from '@/components/empty-state';
import { ListSkeleton } from '@/components/skeleton';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

interface Student {
  id: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
}

type Status = AttendanceEntry['status'];

const OPTIONS: { value: Status; icon: keyof typeof Ionicons.glyphMap; tone: 'success' | 'danger' | 'warning' | 'info' }[] = [
  { value: 'present', icon: 'checkmark', tone: 'success' },
  { value: 'absent', icon: 'close', tone: 'danger' },
  { value: 'late', icon: 'time', tone: 'warning' },
  { value: 'excused', icon: 'shield-checkmark', tone: 'info' },
];

export default function TeachAttendanceScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { classId, scheduleId } = useLocalSearchParams<{ classId: string; className?: string; scheduleId?: string }>();

  const [statuses, setStatuses] = useState<Record<string, Status>>({});

  const query = useQuery<Student[]>({
    queryKey: ['teacher', 'roster', classId],
    queryFn: () => teacherApi.classStudents(classId),
    enabled: !!classId,
  });

  // Roster yuklanganda barchani 'present' qilib boshlaymiz
  useEffect(() => {
    if (query.data && query.data.length > 0) {
      setStatuses((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const init: Record<string, Status> = {};
        query.data!.forEach((s) => (init[s.id] = 'present'));
        return init;
      });
    }
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: () => {
      const today = new Date().toISOString().slice(0, 10);
      const entries: AttendanceEntry[] = (query.data ?? []).map((s) => ({
        studentId: s.id,
        status: statuses[s.id] ?? 'present',
      }));
      return teacherApi.markAttendance({ classId, date: today, scheduleId, entries });
    },
    onSuccess: () => {
      Alert.alert(t('common.success'), t('teach.attendanceSaved'), [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err) => {
      const msg = (err as AxiosError<{ message?: string }>).response?.data?.message ?? t('common.networkError');
      Alert.alert(t('common.error'), typeof msg === 'string' ? msg : t('common.error'));
    },
  });

  if (query.isLoading) return <ListSkeleton />;
  if (query.isError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState icon="cloud-offline-outline" tone="danger" title={t('common.error')} subtitle={t('common.networkError')} actionTitle={t('common.retry')} onAction={() => query.refetch()} />
      </View>
    );
  }
  if (!query.data || query.data.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState icon="people-outline" title={t('teach.noStudents')} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={query.data}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: 96 }}
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
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                {OPTIONS.map((opt) => {
                  const active = current === opt.value;
                  const color = theme[opt.tone];
                  const bg = theme[`${opt.tone}Light` as keyof typeof theme];
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setStatuses((p) => ({ ...p, [item.id]: opt.value }))}
                      style={{
                        flex: 1,
                        height: 40,
                        borderRadius: radius.md,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: active ? bg : 'transparent',
                        borderWidth: 1,
                        borderColor: active ? color : theme.border,
                      }}
                    >
                      <Ionicons name={opt.icon} size={18} color={active ? color : theme.textMuted} />
                      <Text variant="label" style={{ color: active ? color : theme.textMuted, marginTop: 2 }}>
                        {t(`attendance.${opt.value}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          );
        }}
      />
      <View style={{ position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.xl }}>
        <Button title={t('common.save')} icon="save-outline" onPress={() => mutation.mutate()} loading={mutation.isPending} />
      </View>
    </View>
  );
}
