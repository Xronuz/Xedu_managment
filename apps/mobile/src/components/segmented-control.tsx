/**
 * SegmentedControl — inline segment tabs (MOBILE_FOUNDATION_SPEC §2.9).
 * Parent Child Detail (Overview | Davomat | Baholar | ...), Teacher class
 * switcher uchun. `PillTabBar` dan FARQ qiladi — bu bottom nav emas, content
 * tab'lar uchun.
 *
 * Agar segmentlar 4 tadan ko'p bo'lsa — horizontal scrollable bo'ladi
 * (iPhone SE'da sig'masligi uchun).
 */
import { useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from './text';
import { useTheme } from '@/theme/use-theme';
import { radius, spacing } from '@/theme/tokens';
import { impact } from '@/lib/haptics';

export interface Segment<T extends string = string> {
  value: T;
  label: string;
  /** Count badge (optional). */
  badge?: number;
}

interface SegmentedControlProps<T extends string = string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Container style (masalan paddingHorizontal). */
  style?: object;
}

export function SegmentedControl<T extends string = string>({
  segments,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const { theme } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.container, style]}
    >
      {segments.map((seg) => {
        const active = seg.value === value;
        return (
          <Pressable
            key={seg.value}
            onPress={() => { impact('light'); onChange(seg.value); }}
            style={[
              styles.segment,
              {
                backgroundColor: active ? theme.primary : theme.bgSubtle,
              },
            ]}
          >
            <Text variant="label" style={{ color: active ? theme.onPrimary : theme.textMuted }}>
              {seg.label}
            </Text>
            {typeof seg.badge === 'number' && seg.badge > 0 ? (
              <SegmentBadge count={seg.badge} active={active} />
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function SegmentBadge({ count, active }: { count: number; active: boolean }) {
  const { theme } = useTheme();
  return (
    <Animated.View
      style={[
        styles.badge,
        { backgroundColor: active ? 'rgba(255,255,255,0.28)' : theme.danger },
      ]}
    >
      <Text variant="label" style={{ color: active ? theme.onPrimary : theme.card, fontSize: 10 }}>
        {count}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 2 },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    minHeight: 36,
  },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Keep import referenced (Animated used for future enter animation).
void useRef;
