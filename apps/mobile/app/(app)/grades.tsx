import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { studentApi } from '@/api/student';
import { useAuthStore } from '@/store/auth.store';
import { Screen } from '@/components/screen';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { ChipFilter, type ChipOption } from '@/components/chip-filter';
import { ListSkeleton } from '@/components/skeleton';
import { ErrorBanner } from '@/components/error-banner';
import { Surface } from '@/components/dashboard-kit';
import { useTabBarSpace } from '@/lib/tab-space';
import { formatDate } from '@/lib/format';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact } from '@/lib/haptics';

interface GradeRow {
  id: string;
  score: number;
  maxScore: number;
  date: string;
  source?: string;
  comment?: string | null;
  subject?: { name?: string } | null;
}

export default function GradesTab() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const bottomSpace = useTabBarSpace();
  const userId = useAuthStore((s) => s.user?.id) ?? '';

  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  const query = useQuery<GradeRow[]>({
    queryKey: ['student', 'grades', userId],
    queryFn: () => studentApi.grades(userId),
    enabled: !!userId,
    retry: false,
  });

  const rawData: any = query.data;
  const allGrades: GradeRow[] = Array.isArray(rawData) ? rawData : rawData?.data ?? rawData?.items ?? [];

  // Unique subjects for filter chips.
  const subjectChips: ChipOption[] = useMemo(() => {
    const subjects = new Map<string, string>();
    for (const g of allGrades) {
      const name = g.subject?.name ?? t('grades.noSubject', 'Fan ko‘rsatilmagan');
      subjects.set(name, name);
    }
    return [
      { value: 'all', label: 'Barcha fanlar' },
      ...Array.from(subjects.values()).map((name) => ({ value: name, label: name })),
    ];
  }, [allGrades, t]);

  const filtered = subjectFilter === 'all'
    ? allGrades
    : allGrades.filter((g) => (g.subject?.name ?? t('grades.noSubject', 'Fan ko‘rsatilmagan')) === subjectFilter);

  // Average + trend summary.
  const avg = filtered.length > 0
    ? Math.round(filtered.reduce((sum, g) => sum + (g.maxScore > 0 ? (g.score / g.maxScore) * 100 : 0), 0) / filtered.length)
    : null;

  const recent = filtered.slice(0, 5);
  const prevAvg = recent.length > 2
    ? Math.round(recent.slice(1).reduce((sum, g) => sum + (g.maxScore > 0 ? (g.score / g.maxScore) * 100 : 0), 0) / Math.max(recent.slice(1).length, 1))
    : null;
  const trend = avg != null && prevAvg != null ? avg - prevAvg : null;

  return (
    <Screen title="Baholar" scroll={false}>
      {query.isError ? (
        <View style={{ padding: spacing.lg }}>
          <ErrorBanner message={t('common.networkError')} onRetry={() => query.refetch()} />
        </View>
      ) : null}

      {/* Subject filter chips */}
      {allGrades.length > 0 ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
          <ChipFilter
            selected={subjectFilter}
            onSelect={(v) => { impact('light'); setSubjectFilter(v); }}
            options={subjectChips}
          />
        </View>
      ) : null}

      {/* Average + trend summary */}
      {avg != null && !query.isLoading ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
          <Surface style={{ padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ width: 56, height: 56, borderRadius: radius.lg, backgroundColor: avg >= 85 ? theme.successLight : avg >= 60 ? theme.warningLight : theme.dangerLight, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20, fontFamily: fonts.extrabold, color: avg >= 85 ? theme.success : avg >= 60 ? theme.warning : theme.danger }}>{avg}%</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="textMuted">O'rtacha ko'rsatkich</Text>
              <Text variant="bodyStrong" style={{ marginTop: 2 }}>{filtered.length} ta baho asosida</Text>
              {trend != null ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Ionicons name={trend >= 0 ? 'trending-up' : 'trending-down'} size={14} color={trend >= 0 ? theme.success : theme.danger} />
                  <Text variant="label" style={{ color: trend >= 0 ? theme.success : theme.danger }}>
                    {trend >= 0 ? '+' : ''}{trend}% {trend >= 0 ? "o'sish" : "pasayish"}
                  </Text>
                </View>
              ) : null}
            </View>
          </Surface>
        </View>
      ) : null}

      {query.isLoading ? (
        <ListSkeleton rows={5} />
      ) : filtered.length > 0 ? (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: bottomSpace + spacing.xxl }}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} tintColor={theme.primary} />
          }
          renderItem={({ item: row }) => {
            const max = row.maxScore || 100;
            const ratio = max > 0 ? row.score / max : 0;
            const c = ratio >= 0.85 ? theme.success : ratio >= 0.6 ? theme.warning : theme.danger;
            const bg = ratio >= 0.85 ? theme.successLight : ratio >= 0.6 ? theme.warningLight : theme.dangerLight;
            return (
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View style={{ width: 52, height: 52, borderRadius: radius.md, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: c, fontSize: 18, fontFamily: fonts.extrabold }}>{row.score}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {row.subject?.name ?? '—'}
                    </Text>
                    <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
                      {formatDate(row.date)}{`  ·  ${row.score}/${max}`}
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
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
          <Surface style={{ padding: spacing.xxl, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bgSubtle, width: '100%' }}>
            <Ionicons name="school-outline" size={48} color={theme.textMuted} style={{ marginBottom: spacing.md }} />
            <Text variant="heading" style={{ fontSize: 20 }}>Baholar hali yo'q</Text>
            <Text variant="body" color="textMuted" center style={{ marginTop: spacing.sm, marginBottom: spacing.lg }}>
              Birinchi baholashdan keyin bu yerda fanlar bo'yicha o'sish va natijalar ko'rinadi.
            </Text>
            <Button title="Jadvalni ko'rish" onPress={() => router.push('/schedule')} variant="tonal" icon="calendar-outline" />
          </Surface>
        </View>
      )}
    </Screen>
  );
}
