import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { classesApi, type Person } from '@/api/admin';
import { Screen } from '@/components/screen';
import { DataList } from '@/components/data-list';
import { Row } from '@/components/row';
import { Avatar } from '@/components/avatar';

export default function ClassDetailScreen() {
  const { t } = useTranslation();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();

  const query = useQuery<Person[]>({
    queryKey: ['classes', id, 'students'],
    queryFn: () => classesApi.students(id),
    enabled: !!id,
  });

  return (
    <Screen title={name || t('menu.classes')} scroll={false}>
      <Stack.Screen options={{ title: name || t('menu.classes') }} />
      <DataList
        query={query}
        keyExtractor={(p) => p.id}
        emptyIcon="people-outline"
        emptyTitle={t('crud.noStudents')}
        renderItem={(p) => {
          const fullName = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
          return <Row leading={<Avatar name={fullName} uri={p.avatarUrl} size={40} />} title={fullName || '—'} subtitle={p.phone || p.email || ''} />;
        }}
      />
    </Screen>
  );
}
