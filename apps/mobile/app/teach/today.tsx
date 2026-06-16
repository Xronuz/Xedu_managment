import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { teacherApi } from '@/api/teacher';
import { DataList } from '@/components/data-list';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { IconBadge } from '@/components/row';
import { Button } from '@/components/ui';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

interface Lesson {
  id: string;
  timeSlot: number;
  startTime?: string;
  classId: string;
  subject?: { id?: string; name?: string } | null;
  class?: { id: string; name?: string } | null;
}

export default function TeachTodayScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();

  const query = useQuery<Lesson[]>({
    queryKey: ['teacher', 'schedule', 'today'],
    queryFn: teacherApi.scheduleToday,
  });

  return (
    <DataList
      query={query}
      keyExtractor={(l) => l.id}
      emptyIcon="today-outline"
      emptyTitle={t('teach.noLessons')}
      renderItem={(lesson) => {
        const classId = lesson.class?.id ?? lesson.classId;
        const className = lesson.class?.name ?? lesson.subject?.name ?? '';
        return (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <IconBadge icon="book-outline" />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {lesson.subject?.name ?? '—'}
                </Text>
                <Text variant="caption" color="textMuted">
                  {lesson.class?.name ?? ''}
                </Text>
              </View>
              <Text variant="caption" color="textMuted">
                {lesson.startTime ?? `${lesson.timeSlot}`}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Button
                  title={t('teach.attendance')}
                  icon="checkmark-done-outline"
                  variant="tonal"
                  onPress={() =>
                    router.push({ pathname: '/teach/attendance', params: { classId, className, scheduleId: lesson.id } })
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title={t('teach.grade')}
                  icon="create-outline"
                  variant="ghost"
                  onPress={() =>
                    router.push({
                      pathname: '/teach/grades',
                      params: { classId, className, subjectId: lesson.subject?.id ?? '', subjectName: lesson.subject?.name ?? '' },
                    })
                  }
                />
              </View>
            </View>
          </Card>
        );
      }}
    />
  );
}
