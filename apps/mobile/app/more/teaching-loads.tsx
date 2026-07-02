import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { teachingLoadsApi, type TeachingLoad } from '@/api/academic';
import { Screen } from '@/components/screen';
import { DataList } from '@/components/data-list';
import { Row, IconBadge } from '@/components/row';
import { Text } from '@/components/text';

export default function TeachingLoadsScreen() {
  const { t } = useTranslation();
  const query = useQuery<TeachingLoad[]>({ queryKey: ['teaching-loads'], queryFn: teachingLoadsApi.list });

  return (
    <Screen title={t('menu.teachingLoads')} scroll={false}>
      <DataList
        query={query}
        keyExtractor={(l) => l.id}
        emptyIcon="briefcase-outline"
        emptyTitle={t('edu.noLoads')}
        renderItem={(l) => {
          const teacher = l.teacher ? `${l.teacher.firstName ?? ''} ${l.teacher.lastName ?? ''}`.trim() : '—';
          return (
            <Row
              leading={<IconBadge icon="briefcase-outline" color="info" bg="infoLight" />}
              title={teacher}
              subtitle={[l.subject?.name, l.class?.name].filter(Boolean).join(' · ')}
              trailing={l.hoursPerWeek != null ? <Text variant="caption" color="textMuted">{l.hoursPerWeek} {t('edu.hoursWeek')}</Text> : undefined}
            />
          );
        }}
      />
    </Screen>
  );
}
