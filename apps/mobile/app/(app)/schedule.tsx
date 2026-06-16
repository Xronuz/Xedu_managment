import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { studentApi } from '@/api/student';
import { Screen } from '@/components/screen';
import { DataList } from '@/components/data-list';
import { Row, IconBadge } from '@/components/row';
import { Text } from '@/components/text';
import { useTheme } from '@/theme/use-theme';

interface Lesson {
  id: string;
  timeSlot: number;
  startTime?: string;
  endTime?: string;
  subject?: { name?: string; teacher?: { firstName?: string; lastName?: string } | null } | null;
  room?: { name?: string } | null;
}

export default function ScheduleTab() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const query = useQuery<Lesson[]>({
    queryKey: ['student', 'schedule', 'today'],
    queryFn: studentApi.scheduleToday,
  });

  return (
    <Screen title={t('me.todaySchedule')} scroll={false}>
      <DataList
        query={query}
        keyExtractor={(l) => l.id}
        emptyIcon="calendar-outline"
        emptyTitle={t('schedule.empty')}
        renderItem={(lesson) => (
          <Row
            leading={<IconBadge icon="book-outline" />}
            title={lesson.subject?.name ?? '—'}
            subtitle={[
              lesson.subject?.teacher
                ? `${lesson.subject.teacher.firstName ?? ''} ${lesson.subject.teacher.lastName ?? ''}`.trim()
                : null,
              lesson.room?.name,
            ]
              .filter(Boolean)
              .join(' · ')}
            trailing={
              <Text variant="caption" color="textMuted">
                {lesson.startTime ?? `${lesson.timeSlot}`}
                {lesson.endTime ? `–${lesson.endTime}` : ''}
              </Text>
            }
          />
        )}
      />
    </Screen>
  );
}
