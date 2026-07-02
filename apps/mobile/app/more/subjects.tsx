import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { subjectsApi, type SubjectItem } from '@/api/admin';
import { Screen } from '@/components/screen';
import { DataList } from '@/components/data-list';
import { Row, IconBadge } from '@/components/row';
import { Fab } from '@/components/fab';
import { useAuthStore } from '@/store/auth.store';

export default function SubjectsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const role = (useAuthStore((s) => s.user?.role) ?? '').toLowerCase().trim();
  const canCreate = ['director', 'vice_principal', 'branch_admin'].includes(role);

  const query = useQuery<SubjectItem[]>({ queryKey: ['subjects', 'all'], queryFn: () => subjectsApi.list() });

  return (
    <Screen title={t('menu.subjects')} scroll={false}>
      <DataList
        query={query}
        keyExtractor={(s) => s.id}
        emptyIcon="bookmarks-outline"
        emptyTitle={t('crud.noSubjects')}
        renderItem={(s) => (
          <Row
            leading={<IconBadge icon="bookmarks-outline" color="primary" bg="primaryLight" />}
            title={s.name}
            subtitle={s.teacher ? `${s.teacher.firstName ?? ''} ${s.teacher.lastName ?? ''}`.trim() : undefined}
          />
        )}
      />
      {canCreate ? <Fab onPress={() => router.push('/more/subject-new')} /> : null}
    </Screen>
  );
}
