import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { teacherApi } from '@/api/teacher';
import { Screen } from '@/components/screen';
import { DataList } from '@/components/data-list';
import { Row, IconBadge } from '@/components/row';
import { useTheme } from '@/theme/use-theme';

interface ClassRow {
  id: string;
  name?: string;
  gradeLevel?: number;
  studentCount?: number;
  _count?: { students?: number };
}

export default function TeachClassesTab() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();

  const query = useQuery<ClassRow[]>({
    queryKey: ['teacher', 'classes'],
    queryFn: teacherApi.myClasses,
  });

  return (
    <Screen title={t('teach.myClasses')} scroll={false}>
      <DataList
        query={query}
        keyExtractor={(c) => c.id}
        emptyIcon="school-outline"
        emptyTitle={t('teach.noClasses')}
        renderItem={(cls) => {
          const count = cls.studentCount ?? cls._count?.students;
          return (
            <Row
              onPress={() => router.push({ pathname: '/teach/attendance', params: { classId: cls.id, className: cls.name ?? '' } })}
              leading={<IconBadge icon="school-outline" color="info" bg="infoLight" />}
              title={cls.name ?? '—'}
              subtitle={count != null ? `${count} ${t('teach.students')}` : undefined}
              trailing={<Ionicons name="chevron-forward" size={20} color={theme.textMuted} />}
            />
          );
        }}
      />
    </Screen>
  );
}
