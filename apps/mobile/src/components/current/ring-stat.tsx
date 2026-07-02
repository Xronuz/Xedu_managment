import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/text';
import { spacing } from '@/theme/tokens';

/**
 * CURRENT · RingStat — a compact inline stat rendered INSIDE the DayRing.
 *
 * Variant C: the stats live inside the ring so the hero is one unified object.
 * These are NOT the gradient Pulse pills — they are quiet, light, minimal
 * (transparent bg, white glyph + number) so they sit inside the emerald hero
 * without competing with the ring's gradient.
 *
 * Trio: 🔥 streak · ⭐ level · 🪙 coins (rendered as SF glyphs, not emoji).
 */
export interface RingStatProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: number | string;
  label: string;
}

export function RingStat({ icon, value, label }: RingStatProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Ionicons name={icon} size={12} color="rgba(232,251,241,0.85)" />
      <Text variant="label" style={{ color: 'rgba(232,251,241,0.95)', fontSize: 12 }}>
        {value}
      </Text>
      <Text variant="overline" style={{ color: 'rgba(232,251,241,0.5)', fontSize: 9, letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
}

/** Row of 3 RingStats separated by faint dividers. */
export function RingStatRow({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      {children}
    </View>
  );
}
