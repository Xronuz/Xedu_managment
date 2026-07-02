import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { studentApi } from '@/api/student';
import { useAuthStore } from '@/store/auth.store';
import { DataList } from '@/components/data-list';
import { Row, IconBadge } from '@/components/row';
import { Badge, attendanceTone } from '@/components/badge';
import { Text } from '@/components/text';
import { ProgressRing } from '@/components/progress-ring';
import { formatDate } from '@/lib/format';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import type { ThemeColors } from '@/theme/tokens';

interface AttendanceRow {
  id: string;
  date: string;
  status: string;
  schedule?: { subject?: { name?: string } | null } | null;
}

const ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  present: 'checkmark-circle-outline',
  absent: 'close-circle-outline',
  late: 'time-outline',
  excused: 'shield-checkmark-outline',
};
const PRESENTISH = new Set(['present', 'late', 'excused']);

export default function MyAttendanceScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const userId = useAuthStore((s) => s.user?.id) ?? '';

  const query = useQuery<AttendanceRow[]>({
    queryKey: ['student', 'attendance', userId],
    queryFn: () => studentApi.attendance(userId),
    enabled: !!userId,
  });

  const rows = query.data ?? [];
  const present = rows.filter((r) => r.status === 'present' || r.status === 'excused').length;
  const late = rows.filter((r) => r.status === 'late').length;
  const absent = rows.filter((r) => r.status === 'absent').length;
  const attended = rows.filter((r) => PRESENTISH.has(r.status)).length;
  const rate = rows.length ? Math.round((attended / rows.length) * 100) : null;

  const header = rows.length > 0 ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg, backgroundColor: theme.card, borderRadius: radius.xl, borderWidth: 1, borderColor: theme.border, padding: spacing.xl, marginBottom: spacing.md }}>
      <ProgressRing size={76} strokeWidth={8} progress={(rate ?? 0) / 100} color={theme.primary} track={theme.primaryLight}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text }}>{rate}%</Text>
      </ProgressRing>
      <View style={{ flex: 1, gap: spacing.sm }}>
        <SummaryRow color={theme.success} label={t('attendance.present')} value={present} />
        <SummaryRow color={theme.warning} label={t('attendance.late')} value={late} />
        <SummaryRow color={theme.danger} label={t('attendance.absent')} value={absent} />
      </View>
    </View>
  ) : null;

  return (
    <DataList
      query={query}
      ListHeader={header}
      keyExtractor={(r) => r.id}
      emptyIcon="checkmark-done-outline"
      emptyTitle={t('attendance.empty')}
      renderItem={(row) => {
        const tone = attendanceTone(row.status);
        const color: keyof ThemeColors = tone === 'neutral' ? 'textMuted' : tone;
        const bg: keyof ThemeColors = tone === 'neutral' ? 'bgSubtle' : (`${tone}Light` as keyof ThemeColors);
        return (
          <Row
            leading={<IconBadge icon={ICON[row.status] ?? 'ellipse-outline'} color={color} bg={bg} />}
            title={row.schedule?.subject?.name ?? '—'}
            subtitle={formatDate(row.date)}
            trailing={<Badge label={t(`attendance.${row.status}`)} tone={tone} />}
          />
        );
      }}
    />
  );
}

function SummaryRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>{label}</Text>
      <Text variant="bodyStrong">{value}</Text>
    </View>
  );
}
