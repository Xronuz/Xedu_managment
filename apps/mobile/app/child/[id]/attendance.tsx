import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { parentApi } from '@/api/parent';
import { DataList } from '@/components/data-list';
import { Row, IconBadge } from '@/components/row';
import { Badge, attendanceTone } from '@/components/badge';
import { useChildParams } from '@/hooks/use-child';
import { formatDate } from '@/lib/format';
import type { ThemeColors } from '@/theme/tokens';

interface AttendanceRow {
  id: string;
  date: string;
  status: string;
  schedule?: { subject?: { name?: string } | null } | null;
}

const ICON: Record<string, Parameters<typeof IconBadge>[0]['icon']> = {
  present: 'checkmark-circle-outline',
  absent: 'close-circle-outline',
  late: 'time-outline',
  excused: 'shield-checkmark-outline',
};

export default function AttendanceScreen() {
  const { t } = useTranslation();
  const { id } = useChildParams();

  const query = useQuery<AttendanceRow[]>({
    queryKey: ['parent', 'attendance', id],
    queryFn: () => parentApi.getChildAttendance(id),
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
