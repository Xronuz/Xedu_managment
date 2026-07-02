import { Alert, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { learningApi, type Course, type CourseEnrollment } from '@/api/school';
import { useAuthStore } from '@/store/auth.store';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { DataList } from '@/components/data-list';
import { IconBadge } from '@/components/row';
import { Badge } from '@/components/badge';
import { Button } from '@/components/ui';
import { spacing } from '@/theme/tokens';

export default function CoursesScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const isStudent = (useAuthStore((s) => s.user?.role) ?? '').toLowerCase().trim() === 'student';

  const query = useQuery<Course[]>({ queryKey: ['courses', 'all'], queryFn: learningApi.courses });
  const mine = useQuery<CourseEnrollment[]>({ queryKey: ['courses', 'mine'], queryFn: learningApi.myCourses });
  const myIds = new Set((mine.data ?? []).map((e) => e.course?.id).filter(Boolean));

  const enroll = useMutation({
    mutationFn: (courseId: string) => learningApi.enroll(courseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      Alert.alert(t('common.success'), t('more.enrolled'));
    },
    onError: (err) => {
      const msg = (err as AxiosError<{ message?: string }>).response?.data?.message ?? t('common.networkError');
      Alert.alert(t('common.error'), typeof msg === 'string' ? msg : t('common.error'));
    },
  });

  return (
    <DataList
      query={query}
      keyExtractor={(c) => c.id}
      emptyIcon="school-outline"
      emptyTitle={t('more.noCourses')}
      renderItem={(course) => {
        const enrolled = myIds.has(course.id);
        const teacherName = course.teacher ? `${course.teacher.firstName ?? ''} ${course.teacher.lastName ?? ''}`.trim() : '';
        return (
          <Card>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <IconBadge icon="school-outline" color="primary" bg="primaryLight" />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={2}>
                  {course.name}
                </Text>
                {teacherName ? (
                  <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                    {teacherName}
                  </Text>
                ) : null}
                {course.description ? (
                  <Text variant="caption" color="textMuted" style={{ marginTop: 4 }} numberOfLines={2}>
                    {course.description}
                  </Text>
                ) : null}
              </View>
              {isStudent ? (
                enrolled ? (
                  <Badge label={t('more.enrolled')} tone="success" />
                ) : (
                  <Button title={t('more.enroll')} fullWidth={false} variant="tonal" onPress={() => enroll.mutate(course.id)} />
                )
              ) : null}
            </View>
          </Card>
        );
      }}
    />
  );
}
