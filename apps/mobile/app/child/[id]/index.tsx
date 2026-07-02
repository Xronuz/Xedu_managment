import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { parentApi } from '@/api/parent';
import { useChildParams } from '@/hooks/use-child';
import { Text } from '@/components/text';
import { Card } from '@/components/card';
import { Avatar } from '@/components/avatar';
import { SegmentedControl } from '@/components/segmented-control';
import { Surface } from '@/components/dashboard-kit';
import { ListSkeleton } from '@/components/skeleton';
import { ErrorBanner } from '@/components/error-banner';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/badge';
import { formatDate, formatMoney } from '@/lib/format';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Tab = 'overview' | 'attendance' | 'grades' | 'homework' | 'payments';

export default function ChildHub() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { id, name } = useChildParams();
  const [tab, setTab] = useState<Tab>('overview');

  // Parallel queries — har biri o'z tab'i uchun. Graceful fallback.
  const attQ = useQuery({ queryKey: ['parent', 'child', id, 'attendance'], queryFn: () => parentApi.getChildAttendance(id), enabled: !!id, retry: false });
  const gradesQ = useQuery({ queryKey: ['parent', 'child', id, 'grades'], queryFn: () => parentApi.getChildGrades(id), enabled: !!id, retry: false });
  const hwQ = useQuery({ queryKey: ['parent', 'child', id, 'homework'], queryFn: () => parentApi.getChildHomework(id), enabled: !!id, retry: false });
  const payQ = useQuery({ queryKey: ['parent', 'child', id, 'payments'], queryFn: () => parentApi.getChildPayments(id), enabled: !!id, retry: false });

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Stack.Screen options={{ title: name || t('tabs.children') }} />

      {/* Child header */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Avatar name={name} size={52} />
          <View style={{ flex: 1 }}>
            <Text variant="heading" numberOfLines={1}>{name}</Text>
            <Text variant="caption" color="textMuted">{t('role.student')}</Text>
          </View>
        </View>
      </Card>

      {/* Segmented tabs */}
      <SegmentedControl
        segments={[
          { value: 'overview', label: t('child.overview') },
          { value: 'attendance', label: t('child.attendance') },
          { value: 'grades', label: t('child.grades') },
          { value: 'homework', label: t('me.homework') },
          { value: 'payments', label: t('child.payments') },
        ]}
        value={tab}
        onChange={(v) => setTab(v as Tab)}
      />

      {/* Tab content */}
      {tab === 'overview' ? (
        <OverviewTab attQ={attQ} gradesQ={gradesQ} hwQ={hwQ} />
      ) : tab === 'attendance' ? (
        <AttendanceTab query={attQ} />
      ) : tab === 'grades' ? (
        <GradesTab query={gradesQ} />
      ) : tab === 'homework' ? (
        <HomeworkTab query={hwQ} />
      ) : (
        <PaymentsTab query={payQ} />
      )}
    </ScrollView>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  Overview tab — jami ko'rinish (preview dari barcha bo'limlardan)
 * ═══════════════════════════════════════════════════════════════════ */
function OverviewTab({ attQ, gradesQ, hwQ }: { attQ: any; gradesQ: any; hwQ: any }) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const rG: any = gradesQ.data;
  const grades: any[] = Array.isArray(rG) ? rG : rG?.data ?? rG?.items ?? [];
  const rH: any = hwQ.data;
  const hw: any[] = Array.isArray(rH) ? rH : rH?.data ?? rH?.items ?? [];
  const latestGrade = grades[0];
  const pendingHw = hw.filter((h) => h?.status !== 'submitted' && h?.status !== 'graded').length;

  return (
    <View style={{ gap: spacing.md }}>
      <Text variant="heading">{t('child.overview')}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Surface style={{ flex: 1, padding: spacing.lg, gap: spacing.sm }}>
          <Ionicons name="stats-chart-outline" size={22} color={theme.info} />
          {gradesQ.isLoading ? <View style={{ height: 20 }} /> : (
            <Text variant="title">{latestGrade ? `${latestGrade.score}` : '—'}</Text>
          )}
          <Text variant="caption" color="textMuted">{t('student.lastGrade')}</Text>
        </Surface>
        <Surface style={{ flex: 1, padding: spacing.lg, gap: spacing.sm }}>
          <Ionicons name="book-outline" size={22} color={theme.warning} />
          {hwQ.isLoading ? <View style={{ height: 20 }} /> : (
            <Text variant="title">{pendingHw}</Text>
          )}
          <Text variant="caption" color="textMuted">{t('me.homework')}</Text>
        </Surface>
      </View>

      {/* Oxirgi baholar preview */}
      {grades.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" color="textMuted">{t('grades.recent').toUpperCase()}</Text>
          <Surface style={{ padding: spacing.md, gap: spacing.sm }}>
            {grades.slice(0, 3).map((g: any, i: number) => (
              <View key={g?.id ?? i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{ width: 32, height: 32, borderRadius: radius.md, backgroundColor: theme.infoLight, alignItems: 'center', justifyContent: 'center' }}>
                  <Text variant="bodyStrong" style={{ color: theme.info }}>{g?.score ?? '—'}</Text>
                </View>
                <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>{g?.subject?.name ?? '—'}</Text>
                <Text variant="caption" color="textMuted">{g?.date ? formatDate(g.date) : ''}</Text>
              </View>
            ))}
          </Surface>
        </View>
      ) : null}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  Attendance tab
 * ═══════════════════════════════════════════════════════════════════ */
function AttendanceTab({ query }: { query: any }) {
  const { t } = useTranslation();
  const rData: any = query.data;
  const items: any[] = Array.isArray(rData) ? rData : rData?.data ?? rData?.items ?? [];

  if (query.isLoading) return <ListSkeleton rows={4} />;
  if (query.isError) return <ErrorBanner message={t('common.networkError')} onRetry={() => query.refetch()} />;
  if (items.length === 0) return <EmptyState icon="checkmark-done-outline" title={t('attendance.empty')} />;

  return (
    <View style={{ gap: spacing.md }}>
      {items.slice(0, 20).map((r: any, i: number) => {
        const status = r?.status ?? 'present';
        const tone = status === 'present' ? 'success' : status === 'absent' ? 'danger' : status === 'late' ? 'warning' : 'neutral';
        return (
          <Card key={r?.id ?? i}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{r?.date ? formatDate(r.date) : '—'}</Text>
                {r?.note ? <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>{r.note}</Text> : null}
              </View>
              <Badge label={t(`attendance.${status}`)} tone={tone as any} />
            </View>
          </Card>
        );
      })}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  Grades tab
 * ═══════════════════════════════════════════════════════════════════ */
function GradesTab({ query }: { query: any }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const rData: any = query.data;
  const items: any[] = Array.isArray(rData) ? rData : rData?.data ?? rData?.items ?? [];

  if (query.isLoading) return <ListSkeleton rows={4} />;
  if (query.isError) return <ErrorBanner message={t('common.networkError')} onRetry={() => query.refetch()} />;
  if (items.length === 0) return <EmptyState icon="stats-chart-outline" title={t('grades.empty')} />;

  return (
    <View style={{ gap: spacing.md }}>
      {items.slice(0, 20).map((g: any, i: number) => {
        const max = g?.maxScore || 100;
        const ratio = max > 0 ? (g?.score ?? 0) / max : 0;
        const c = ratio >= 0.85 ? theme.success : ratio >= 0.6 ? theme.warning : theme.danger;
        const bg = ratio >= 0.85 ? theme.successLight : ratio >= 0.6 ? theme.warningLight : theme.dangerLight;
        return (
          <Card key={g?.id ?? i}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="bodyStrong" style={{ color: c, fontSize: 16 }}>{g?.score ?? '—'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>{g?.subject?.name ?? '—'}</Text>
                <Text variant="caption" color="textMuted">{g?.date ? formatDate(g.date) : ''}{`  ·  ${g?.score ?? 0}/${max}`}</Text>
              </View>
            </View>
          </Card>
        );
      })}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  Homework tab
 * ═══════════════════════════════════════════════════════════════════ */
function HomeworkTab({ query }: { query: any }) {
  const { t } = useTranslation();
  const rData: any = query.data;
  const items: any[] = Array.isArray(rData) ? rData : rData?.data ?? rData?.items ?? [];

  if (query.isLoading) return <ListSkeleton rows={4} />;
  if (query.isError) return <ErrorBanner message={t('common.networkError')} onRetry={() => query.refetch()} />;
  if (items.length === 0) return <EmptyState icon="book-outline" title={t('homework.empty')} />;

  return (
    <View style={{ gap: spacing.md }}>
      {items.slice(0, 20).map((h: any, i: number) => {
        const done = h?.status === 'submitted' || h?.status === 'graded';
        return (
          <Card key={h?.id ?? i}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>{h?.title ?? '—'}</Text>
                {h?.subject?.name ? <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>{h.subject.name}</Text> : null}
                <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>{h?.dueDate ? formatDate(h.dueDate) : ''}</Text>
              </View>
              {done ? <Badge label={t('homework.submittedBadge')} tone="success" /> : <Badge label={t('homework.pending')} tone="warning" />}
            </View>
          </Card>
        );
      })}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  Payments tab
 * ═══════════════════════════════════════════════════════════════════ */
function PaymentsTab({ query }: { query: any }) {
  const { t } = useTranslation();
  const rData: any = query.data;
  const items: any[] = Array.isArray(rData) ? rData : rData?.data ?? rData?.items ?? [];

  if (query.isLoading) return <ListSkeleton rows={3} />;
  if (query.isError) return <ErrorBanner message={t('common.networkError')} onRetry={() => query.refetch()} />;
  if (items.length === 0) return <EmptyState icon="card-outline" title={t('fin.noPayments')} />;

  return (
    <View style={{ gap: spacing.md }}>
      {items.slice(0, 20).map((p: any, i: number) => {
        const status = p?.status ?? 'pending';
        const tone = status === 'paid' ? 'success' : status === 'overdue' ? 'danger' : 'warning';
        return (
          <Card key={p?.id ?? i}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>{p?.description ?? t('fin.payments')}</Text>
                {p?.dueDate ? <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>{formatDate(p.dueDate)}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text variant="bodyStrong">{p?.amount != null ? formatMoney(p.amount) : '—'}</Text>
                <Badge label={t(`fin.status.${status}`, { defaultValue: status })} tone={tone as any} />
              </View>
            </View>
          </Card>
        );
      })}
    </View>
  );
}
