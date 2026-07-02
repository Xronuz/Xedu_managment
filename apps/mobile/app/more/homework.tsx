import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { homeworkApi, type HomeworkItem } from '@/api/academic';
import { useAuthStore } from '@/store/auth.store';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { DataList } from '@/components/data-list';
import { IconBadge } from '@/components/row';
import { Fab } from '@/components/fab';
import { formatDate } from '@/lib/format';
import { spacing } from '@/theme/tokens';

export default function HomeworkScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const role = (useAuthStore((s) => s.user?.role) ?? '').toLowerCase().trim();
  const canCreate = ['teacher', 'class_teacher', 'director', 'vice_principal', 'branch_admin'].includes(role);

  const query = useQuery<HomeworkItem[]>({
    queryKey: ['homework', 'list'],
    queryFn: homeworkApi.list,
  });

  return (
    <View style={{ flex: 1 }}>
      <DataList
        query={query}
        keyExtractor={(h) => h.id}
        emptyIcon="book-outline"
        emptyTitle={t('hw.empty')}
        renderItem={(hw) => {
          const overdue = new Date(hw.dueDate) < new Date();
          return (
            <Card>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <IconBadge icon="book-outline" color="primary" bg="primaryLight" />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={2}>
                    {hw.title}
                  </Text>
                  <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                    {[hw.subject?.name, hw.class?.name].filter(Boolean).join(' · ')}
                  </Text>
                  {hw.description ? (
                    <Text variant="caption" color="textMuted" style={{ marginTop: 4 }} numberOfLines={2}>
                      {hw.description}
                    </Text>
                  ) : null}
                  <Text variant="label" color={overdue ? 'danger' : 'textMuted'} style={{ marginTop: 6 }}>
                    {t('hw.due')}: {formatDate(hw.dueDate)}
                  </Text>
                </View>
              </View>
            </Card>
          );
        }}
      />
      {canCreate ? <Fab onPress={() => router.push('/more/homework-new' as Href)} /> : null}
    </View>
  );
}
