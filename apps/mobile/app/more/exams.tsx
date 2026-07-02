import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { examsApi, type ExamItem } from '@/api/school';
import { useAuthStore } from '@/store/auth.store';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { DataList } from '@/components/data-list';
import { IconBadge } from '@/components/row';
import { Badge } from '@/components/badge';
import { Fab } from '@/components/fab';
import { formatDateTime } from '@/lib/format';
import { spacing } from '@/theme/tokens';

export default function ExamsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const role = (useAuthStore((s) => s.user?.role) ?? '').toLowerCase().trim();
  const canCreate = ['teacher', 'class_teacher', 'director', 'vice_principal', 'branch_admin'].includes(role);

  const query = useQuery<ExamItem[]>({
    queryKey: ['exams', 'upcoming'],
    queryFn: examsApi.upcoming,
  });

  return (
    <View style={{ flex: 1 }}>
    <DataList
      query={query}
      keyExtractor={(e) => e.id}
      emptyIcon="clipboard-outline"
      emptyTitle={t('more.noExams')}
      renderItem={(exam) => (
        <Card>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <IconBadge icon="clipboard-outline" color="info" bg="infoLight" />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" numberOfLines={2}>
                {exam.title}
              </Text>
              <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                {[exam.subject?.name, exam.class?.name].filter(Boolean).join(' · ')}
              </Text>
              {exam.scheduledAt ? (
                <Text variant="label" color="textMuted" style={{ marginTop: 6 }}>
                  {formatDateTime(exam.scheduledAt)}
                </Text>
              ) : null}
            </View>
            {exam.maxScore ? <Badge label={`${t('more.maxScore')}: ${exam.maxScore}`} tone="primary" /> : null}
          </View>
        </Card>
      )}
    />
    {canCreate ? <Fab onPress={() => router.push('/more/exam-new' as Href)} /> : null}
    </View>
  );
}
