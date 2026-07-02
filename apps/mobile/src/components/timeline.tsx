/**
 * Timeline — vertical timeline with time indicators (MOBILE_FOUNDATION_SPEC §5.3, F7).
 * Teacher Today va Student Schedule uchun. Har item: vaqt (soat), sarlavha,
 * kichik matn, ikonka. Chap tomonda vertikal chiziq + nuqta, o'ngda card.
 *
 * Ishlatish:
 *   <Timeline items={[
 *     { id: '1', time: '08:00', title: 'Matematika', subtitle: '9A · 308-xona', icon: 'school' },
 *     { id: '2', time: '09:00', title: 'Fizika',    subtitle: '10B · 105-xona', icon: 'school' },
 *   ]} />
 */
import { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './text';
import { Surface } from './dashboard-kit';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact } from '@/lib/haptics';

export interface TimelineItem {
  id: string;
  /** "08:00" kabi vaqt yoki matn. */
  time?: string;
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Bosilganda (optional). */
  onPress?: () => void;
  /** O'ng tomondagi slot (status badge, tugma). */
  trailing?: ReactNode;
  /** Highlight (joriy dars). */
  active?: boolean;
}

interface TimelineProps {
  items: TimelineItem[];
}

export function Timeline({ items }: TimelineProps) {
  const { theme } = useTheme();

  if (items.length === 0) return null;

  return (
    <View style={{ gap: 0 }}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const dotColor = item.active ? theme.primary : theme.borderStrong;
        return (
          <View key={item.id} style={{ flexDirection: 'row' }}>
            {/* Left rail: time + vertical line + dot */}
            <View style={{ width: 56, alignItems: 'flex-end', paddingRight: spacing.sm }}>
              {item.time ? (
                <Text variant="label" color={item.active ? 'primary' : 'textMuted'} style={{ marginTop: 14 }}>
                  {item.time}
                </Text>
              ) : null}
            </View>
            <View style={{ width: 24, alignItems: 'center' }}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: dotColor,
                  marginTop: 18,
                  borderWidth: 2,
                  borderColor: theme.card,
                }}
              />
              {!isLast ? (
                <View style={{ width: 2, flex: 1, backgroundColor: theme.border, marginTop: -1 }} />
              ) : null}
            </View>
            {/* Card */}
            <View style={{ flex: 1, paddingBottom: isLast ? 0 : spacing.md, paddingLeft: spacing.xs }}>
              <TimelineCard item={item} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function TimelineCard({ item }: { item: TimelineItem }) {
  const { theme } = useTheme();

  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      {item.icon ? (
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: radius.md,
            backgroundColor: item.active ? theme.primaryLight : theme.bgSubtle,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={item.icon} size={20} color={item.active ? theme.primary : theme.textSecondary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1}>{item.title}</Text>
        {item.subtitle ? (
          <Text variant="caption" color="textMuted" numberOfLines={1} style={{ marginTop: 1 }}>{item.subtitle}</Text>
        ) : null}
      </View>
      {item.trailing ?? null}
    </View>
  );

  if (item.onPress) {
    return (
      <Pressable onPress={() => { impact('light'); item.onPress?.(); }}>
        {({ pressed }) => (
          <Surface style={{ padding: spacing.md, opacity: pressed ? 0.88 : 1 }}>{inner}</Surface>
        )}
      </Pressable>
    );
  }

  return <Surface style={{ padding: spacing.md }}>{inner}</Surface>;
}
