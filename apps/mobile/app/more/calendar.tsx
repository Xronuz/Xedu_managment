import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { calendarApi, type CalendarEvent } from '@/api/school';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { DataList } from '@/components/data-list';
import { formatDate } from '@/lib/format';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function CalendarScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const query = useQuery<CalendarEvent[]>({
    queryKey: ['calendar', 'events'],
    queryFn: calendarApi.events,
  });

  return (
    <DataList
      query={query}
      keyExtractor={(e) => e.id}
      emptyIcon="calendar-outline"
      emptyTitle={t('more.noEvents')}
      renderItem={(ev) => {
        const accent = ev.color || theme.primary;
        const sameDay = formatDate(ev.startDate) === formatDate(ev.endDate);
        return (
          <Card>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ width: 4, borderRadius: radius.pill, backgroundColor: accent }} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={2}>
                  {ev.title}
                </Text>
                <Text variant="caption" color="primary" style={{ marginTop: 2 }}>
                  {sameDay ? formatDate(ev.startDate) : `${formatDate(ev.startDate)} – ${formatDate(ev.endDate)}`}
                </Text>
                {ev.description ? (
                  <Text variant="caption" color="textMuted" style={{ marginTop: 4 }} numberOfLines={3}>
                    {ev.description}
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
