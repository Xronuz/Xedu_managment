import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { studentApi } from '@/api/student';
import { useAuthStore } from '@/store/auth.store';
import { DataList } from '@/components/data-list';
import { Row, IconBadge } from '@/components/row';
import { Badge, attendanceTone } from '@/components/badge';
import { formatDate } from '@/lib/format';
import { Ionicons } from '@expo/vector-icons';
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

export default function MyAttendanceScreen() {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.user?.id) ?? '';

  const query = useQuery<AttendanceRow[]>({
    queryKey: ['student', 'attendance', userId],
    queryFn: () => studentApi.attendance(userId),
    enabled: !!userId,
  });

  return (
    <DataList
      query={query}
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
