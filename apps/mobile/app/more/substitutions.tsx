import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { substitutionsApi, type Substitution } from '@/api/academic';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { DataList } from '@/components/data-list';
import { IconBadge } from '@/components/row';
import { Badge } from '@/components/badge';
import { formatDate } from '@/lib/format';
import { spacing } from '@/theme/tokens';

const TONE: Record<string, 'success' | 'warning' | 'danger' | 'primary' | 'neutral'> = {
  approved: 'success',
  applied: 'success',
  proposed: 'warning',
  pending: 'warning',
  rejected: 'danger',
  cancelled: 'neutral',
};

function name(p?: { firstName?: string; lastName?: string } | null) {
  return p ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() : '—';
}

export default function SubstitutionsScreen() {
  const { t } = useTranslation();

  const query = useQuery<Substitution[]>({
    queryKey: ['substitutions', 'list'],
    queryFn: substitutionsApi.list,
  });

  return (
    <View style={{ flex: 1 }}>
      <DataList
        query={query}
        keyExtractor={(s) => s.id}
        emptyIcon="swap-horizontal-outline"
        emptyTitle={t('sub.empty')}
        renderItem={(s) => (
          <Card>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <IconBadge icon="swap-horizontal-outline" color="info" bg="infoLight" />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {[s.schedule?.subject?.name, s.schedule?.class?.name].filter(Boolean).join(' · ') || t('menu.substitutions')}
                </Text>
                <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                  {name(s.originalTeacher)} → {name(s.substituteTeacher)}
                </Text>
                <Text variant="label" color="textMuted" style={{ marginTop: 6 }}>
                  {formatDate(s.date)}
                </Text>
              </View>
              <Badge label={t(`sub.status.${s.status}`, { defaultValue: s.status })} tone={TONE[s.status] ?? 'neutral'} />
            </View>
          </Card>
        )}
      />
    </View>
  );
}
