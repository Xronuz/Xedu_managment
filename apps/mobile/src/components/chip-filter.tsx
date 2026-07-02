/**
 * ChipFilter — horizontal scrollable chip filter (MOBILE_FOUNDATION_SPEC §2.8).
 * SearchBar bilan List orasida joylashtiriladi. Maksimal 3-5 variant.
 *
 * Ishlatish:
 *   <ChipFilter
 *     selected={status}
 *     onSelect={setStatus}
 *     options={[
 *       { value: 'all', label: 'Hammasi' },
 *       { value: 'pending', label: 'Kutilmoqda', tone: 'warning' },
 *       { value: 'paid', label: "To'langan", tone: 'success' },
 *     ]}
 *   />
 */
import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './text';
import { useTheme } from '@/theme/use-theme';
import { radius, spacing } from '@/theme/tokens';
import { impact } from '@/lib/haptics';

export type ChipTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

export interface ChipOption<T extends string = string> {
  value: T;
  label: string;
  tone?: ChipTone;
  /** Count badge (optional). */
  count?: number;
}

interface ChipFilterProps<T extends string = string> {
  options: ChipOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  /** ContentContainerStyle ga qo'shimcha — masalan, horizontal padding. */
  contentContainerStyle?: object;
}

export function ChipFilter<T extends string = string>({
  options,
  selected,
  onSelect,
  contentContainerStyle,
}: ChipFilterProps<T>) {
  const { theme } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  const toneFg = (tone: ChipTone, active: boolean): string => {
    if (!active) {
      return theme.textMuted;
    }
    switch (tone) {
      case 'primary': return theme.primary;
      case 'success': return theme.success;
      case 'warning': return theme.warning;
      case 'danger': return theme.danger;
      case 'info': return theme.info;
      case 'accent': return theme.accent;
      default: return theme.text;
    }
  };

  const toneBg = (tone: ChipTone, active: boolean): string => {
    if (!active) return theme.bgSubtle;
    switch (tone) {
      case 'primary': return theme.primaryLight;
      case 'success': return theme.successLight;
      case 'warning': return theme.warningLight;
      case 'danger': return theme.dangerLight;
      case 'info': return theme.infoLight;
      case 'accent': return theme.accentLight;
      default: return theme.bgSubtle;
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.container, contentContainerStyle]}
    >
      {options.map((opt) => {
        const tone = opt.tone ?? 'neutral';
        const active = opt.value === selected;
        const fg = toneFg(tone, active);
        const bg = toneBg(tone, active);
        return (
          <Pressable
            key={opt.value}
            onPress={() => { impact('light'); onSelect(opt.value); }}
            style={[
              styles.chip,
              { backgroundColor: bg, borderColor: active ? fg : 'transparent', borderWidth: active ? 1 : 0 },
            ]}
          >
            <Text variant="label" style={{ color: fg }}>{opt.label}</Text>
            {typeof opt.count === 'number' && opt.count > 0 ? (
              <View style={[styles.count, { backgroundColor: active ? fg : theme.borderStrong }]}>
                <Text variant="label" style={{ color: active ? theme.card : theme.card, fontSize: 10 }}>
                  {opt.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    minHeight: 36,
  },
  count: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Keep `View` import used for potential future wrapping.
void View;
