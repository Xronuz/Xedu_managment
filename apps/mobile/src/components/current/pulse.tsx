import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/text';
import { radius, spacing, anim } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact, success as successHaptic } from '@/lib/haptics';
import { useReduceMotion } from './use-reduce-motion';

/**
 * CURRENT · Pulse — a living stat chip.
 *
 * v3 art direction: NO emoji. Premium SF-symbol-style glyphs on glossy
 * gradient pills. The pill IS the 3D object; the glyph carries the meaning.
 *
 * See CURRENT_DESIGN_SYSTEM.md §4.
 */
export type PulseTone = 'streak' | 'xp' | 'coins' | 'wins' | 'neutral';

export interface PulseProps {
  /** SF-symbol-style icon (e.g. 'flame','star','ribbon','trophy'). */
  icon: keyof typeof Ionicons.glyphMap;
  value: number | string;
  label?: string;
  tone?: PulseTone;
  size?: 'sm' | 'md';
  delta?: number;
  onPress?: () => void;
}

function gradient(tone: PulseTone, isDark: boolean): [string, string] {
  switch (tone) {
    case 'streak': return ['#FFB35C', '#E8590C'];
    case 'xp': return isDark ? ['#5BD6A4', '#1F8F62'] : ['#5BD6A4', '#0F9F66'];
    case 'coins': return ['#FFD980', '#C77D11'];
    case 'wins': return isDark ? ['#F5B53D', '#C77D11'] : ['#FFCB52', '#E08A12'];
    default: return isDark ? ['#2A3530', '#1A2420'] : ['#EEF2EF', '#D7DEDA'];
  }
}

/** The right premium glyph per tone. No emoji. */
function glyphFor(tone: PulseTone): keyof typeof Ionicons.glyphMap {
  switch (tone) {
    case 'streak': return 'flame';
    case 'xp': return 'star';
    case 'coins': return 'ribbon'; // elegant, like a medal ribbon
    case 'wins': return 'trophy';
    default: return 'sparkles';
  }
}

/** Pressable style factory — extracted to avoid TSX arrow-return parse ambiguity. */
const pressedStyle = ({ pressed }: { pressed: boolean }) => ({
  opacity: pressed ? 0.92 : 1,
  transform: [{ scale: pressed ? 0.96 : 1 }],
});

export function Pulse({
  icon,
  value,
  label,
  tone = 'neutral',
  size = 'sm',
  delta,
  onPress,
}: PulseProps) {
  const { theme, isDark } = useTheme();
  const reduce = useReduceMotion();

  const isStreakSleeping = tone === 'streak' && (value === 0 || value === '0');
  const grad = gradient(tone, isDark);
  const glyph = tone === 'neutral' ? icon : glyphFor(tone);

  const height = size === 'md' ? 44 : 38;
  const iconSize = size === 'md' ? 17 : 15;

  // ── Pop animation on value change ──────────────────────────────────────────
  const scale = useRef(new Animated.Value(1)).current;
  const iconSpin = useRef(new Animated.Value(0)).current;
  const lastValue = useRef<typeof value>(value);
  const mountedAt = useRef(false);

  useEffect(() => { mountedAt.current = true; return () => { mountedAt.current = false; }; }, []);

  useEffect(() => {
    if (!mountedAt.current) { mountedAt.current = true; lastValue.current = value; return; }
    const changed = value !== lastValue.current;
    lastValue.current = value;
    const positive = delta != null ? delta > 0
      : typeof value === 'number' && typeof lastValue.current === 'number' ? value > lastValue.current : false;

    if (!changed || reduce) return;
    if (positive) successHaptic();
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.18, duration: anim.duration.instant, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, ...anim.spring.bouncy, useNativeDriver: true }),
    ]).start();
    if (positive) {
      Animated.timing(iconSpin, { toValue: 1, duration: anim.duration.normal, useNativeDriver: true }).start(() => iconSpin.setValue(0));
    }
  }, [value, delta, reduce, scale, iconSpin]);

  // ── Sleeping streak breathe ─────────────────────────────────────────────────
  const breathe = useRef(new Animated.Value(reduce ? 0.6 : 0.5)).current;
  useEffect(() => {
    if (!isStreakSleeping || reduce) { breathe.setValue(0.8); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 0.85, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0.55, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isStreakSleeping, reduce, breathe]);

  const spin = iconSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const textOnColor = isStreakSleeping || tone === 'neutral';

  const inner = (
    <Animated.View
      style={[styles.chip, { height, opacity: isStreakSleeping ? breathe : 1, transform: [{ scale }] }]}
    >
      <LinearGradient
        colors={isStreakSleeping ? (isDark ? ['#2A3530', '#1A2420'] : ['#F0F3F1', '#E2E7E4']) : grad}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', inset: 0, borderRadius: radius.pill }}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', borderRadius: radius.pill }}
      />

      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Ionicons name={glyph} size={iconSize} color={textOnColor ? theme.textMuted : '#FFFFFF'} />
      </Animated.View>

      <View style={{ alignItems: 'center' }}>
        <Text variant={size === 'md' ? 'bodyStrong' : 'label'} style={{ color: textOnColor ? theme.text : '#FFFFFF' }}>
          {value}
        </Text>
        {label ? (
          <Text variant="overline" style={{ color: textOnColor ? theme.textMuted : 'rgba(255,255,255,0.85)', marginTop: -1 }}>
            {label}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={() => { impact('light'); onPress(); }}
        style={pressedStyle}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? ''}: ${value}`}
      >
        {inner}
      </Pressable>
    );
  }
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={isStreakSleeping ? `Streak: 0 — start today` : `${label ?? ''}: ${value}`}
    >
      {inner}
    </View>
  );
}

/**
 * PulseRow — horizontal arrangement of Pulse chips.
 */
export function PulseRow({ children, style }: { children: React.ReactNode; style?: View['props']['style'] }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: radius.pill,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
