import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { parentApi } from '@/api/parent';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { DataList } from '@/components/data-list';
import { useChildParams } from '@/hooks/use-child';
import { formatDate } from '@/lib/format';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

interface GradeRow {
  id: string;
  score: number;
  maxScore: number;
  date: string;
  source?: string;
  comment?: string | null;
  subject?: { name?: string } | null;
}

export default function GradesScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { id } = useChildParams();

  const query = useQuery<GradeRow[]>({
    queryKey: ['parent', 'grades', id],
    queryFn: () => parentApi.getChildGrades(id),
  });

  return (
    <DataList
      query={query}
      keyExtractor={(r) => r.id}
      emptyIcon="stats-chart-outline"
      emptyTitle={t('grades.empty')}
      renderItem={(row) => {
        const max = row.maxScore || 100;
        const ratio = max > 0 ? row.score / max : 0;
        const scoreColor = ratio >= 0.85 ? theme.success : ratio >= 0.6 ? theme.warning : theme.danger;
        const scoreBg = ratio >= 0.85 ? theme.successLight : ratio >= 0.6 ? theme.warningLight : theme.dangerLight;
        return (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: radius.md,
                  backgroundColor: scoreBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: scoreColor, fontSize: 18, fontFamily: fonts.extrabold }}>{row.score}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {row.subject?.name ?? '—'}
                </Text>
                <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
                  {formatDate(row.date)}
                  {row.source && row.source !== 'manual' ? ` · ${t(`grades.${row.source}`)}` : ''}
                  {`  ·  ${row.score}/${max}`}
                </Text>
                {row.comment ? (
                  <Text variant="caption" color="textMuted" style={{ marginTop: 4 }} numberOfLines={2}>
                    {row.comment}
                  </Text>
                ) : null}
              </View>
            </View>
          </Card>
        );
      }}
    />
  );
}
