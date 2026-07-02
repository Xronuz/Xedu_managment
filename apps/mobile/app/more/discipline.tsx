import { useRouter, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { disciplineApi, type DisciplineIncident } from '@/api/academic';
import { Screen, Card } from '@/components/screen';
import { Text } from '@/components/text';
import { DataList } from '@/components/data-list';
import { IconBadge } from '@/components/row';
import { Badge } from '@/components/badge';
import { Fab } from '@/components/fab';
import { formatDate } from '@/lib/format';
import { spacing } from '@/theme/tokens';

function sevTone(s?: string): 'neutral' | 'warning' | 'danger' {
  return s === 'high' ? 'danger' : s === 'medium' ? 'warning' : 'neutral';
}

export default function DisciplineScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const query = useQuery<DisciplineIncident[]>({ queryKey: ['discipline'], queryFn: disciplineApi.list });

  return (
    <Screen title={t('menu.discipline')} scroll={false}>
      <DataList
        query={query}
        keyExtractor={(d) => d.id}
        emptyIcon="shield-outline"
        emptyTitle={t('edu.noIncidents')}
        renderItem={(d) => {
          const name = d.student ? `${d.student.firstName ?? ''} ${d.student.lastName ?? ''}`.trim() : '';
          const typeLabel = d.type && i18n.exists(`edu.discType.${d.type}`) ? t(`edu.discType.${d.type}`) : d.type;
          return (
            <Card>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <IconBadge icon="shield-outline" color={sevTone(d.severity) === 'danger' ? 'danger' : 'warning'} bg={sevTone(d.severity) === 'danger' ? 'dangerLight' : 'warningLight'} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{name || typeLabel || '—'}</Text>
                    {d.severity ? <Badge label={t(`edu.discSeverity.${d.severity}`)} tone={sevTone(d.severity)} /> : null}
                  </View>
                  <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }} numberOfLines={2}>{d.description}</Text>
                  <Text variant="label" color="textMuted" style={{ marginTop: 6 }}>{[typeLabel, formatDate(d.date)].filter(Boolean).join(' · ')}</Text>
                </View>
              </View>
            </Card>
          );
        }}
      />
      <Fab onPress={() => router.push('/more/discipline-new' as Href)} />
    </Screen>
  );
}
