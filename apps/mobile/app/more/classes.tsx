import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { classesApi, type ClassItem } from '@/api/admin';
import { Screen } from '@/components/screen';
import { DataList } from '@/components/data-list';
import { Row, IconBadge } from '@/components/row';
import { Fab } from '@/components/fab';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/theme/use-theme';

export default function ClassesScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const role = (useAuthStore((s) => s.user?.role) ?? '').toLowerCase().trim();
  const canCreate = ['director', 'vice_principal', 'branch_admin'].includes(role);

  const query = useQuery<ClassItem[]>({ queryKey: ['classes', 'all'], queryFn: classesApi.list });

  return (
    <Screen title={t('menu.classes')} scroll={false}>
      <DataList
        query={query}
        keyExtractor={(c) => c.id}
        emptyIcon="easel-outline"
        emptyTitle={t('crud.noClasses')}
        renderItem={(cls) => {
          const count = cls.studentCount ?? cls._count?.students;
          return (
            <Row
              onPress={() => router.push({ pathname: '/more/class', params: { id: cls.id, name: cls.name } })}
              leading={<IconBadge icon="easel-outline" color="info" bg="infoLight" />}
              title={cls.name}
              subtitle={count != null ? `${count} ${t('crud.students')}` : undefined}
              trailing={<Ionicons name="chevron-forward" size={20} color={theme.textMuted} />}
            />
          );
        }}
      />
      {canCreate ? <Fab onPress={() => router.push('/more/class-new')} /> : null}
    </Screen>
  );
}
