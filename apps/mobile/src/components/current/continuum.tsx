import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/text';
import { radius, spacing, anim } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact } from '@/lib/haptics';
import { useReduceMotion } from './use-reduce-motion';

/** Pressable style factory — extracted to avoid TSX arrow-return parse ambiguity. */
const pressedStyle = ({ pressed }: { pressed: boolean }) => ({
  opacity: pressed ? 0.92 : 1,
  transform: [{ scale: pressed ? 0.99 : 1 }],
});

/**
 * CURRENT · Continuum — per-subject growth as a sparkline + direction word.
 *
 * Replaces pass/fail colour coding entirely. A 58% is "climbing". The data
 * is the same; the story is humane. GitHub direction + a doctor's note,
 * never a red F.
 *
 * See CURRENT_DESIGN_SYSTEM.md §9.
 */
export type ContinuumDirection = 'rising' | 'steady' | 'needs-care';

export interface ContinuumProps {
  /** Subject name. */
  label: string;
  /** Recent scores, chronological (oldest → newest). */
  points: number[];
  /** Derived from last-vs-prev if omitted. */
  direction?: ContinuumDirection;
  /** e.g. "78%" or "B+". */
  latestLabel?: string;
  onPress?: () => void;
}

export function deriveDirection(points: number[]): ContinuumDirection {
  if (points.length < 2) return 'steady';
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const diff = last - prev;
  if (diff >= 5) return 'rising';
  if (diff <= -5) return 'needs-care';
  return 'steady';
}

const DIRECTION_WORDS: Record<ContinuumDirection, string> = {
  rising: 'climbing',
  steady: 'steady',
  'needs-care': 'needs care',
};

export function Continuum({ label, points, direction, latestLabel, onPress }: ContinuumProps) {
  const { theme } = useTheme();
  const reduce = useReduceMotion();

  const dir = direction ?? deriveDirection(points);
  const word = DIRECTION_WORDS[dir];

  const colorFor = (d: ContinuumDirection) =>
    d === 'rising' ? theme.primary : d === 'steady' ? theme.info : theme.warning;
  const color = colorFor(dir);

  // Sparkline geometry.
  const W = 64;
  const H = 28;
  const pad = 3;
  const safePoints = points.length > 0 ? points : [0];
  const min = Math.min(...safePoints);
  const max = Math.max(...safePoints);
  const range = max - min || 1;
  const stepX = safePoints.length > 1 ? (W - pad * 2) / (safePoints.length - 1) : 0;
  const coords = safePoints.map((p, i) => {
    const x = pad + i * stepX;
    const y = H - pad - ((p - min) / range) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polylinePoints = coords.join(' ');
  const lastCoord = coords[coords.length - 1].split(',').map(Number);
  const tooFew = points.length < 2;

  // Draw-in animation.
  const opacity = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) return;
    Animated.timing(opacity, { toValue: 1, duration: anim.duration.slow, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [reduce, opacity]);

  const a11y = `${label}, latest ${latestLabel ?? safePoints[safePoints.length - 1]}, ${word}`;

  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}>
      {/* Label + direction */}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {label}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <Ionicons
            name={dir === 'rising' ? 'trending-up' : dir === 'steady' ? 'remove' : 'trending-down'}
            size={13}
            color={color}
          />
          <Text variant="caption" style={{ color }}>
            {word}
          </Text>
        </View>
      </View>

      {/* Sparkline */}
      {tooFew ? (
        <Text variant="caption" color="textMuted" style={{ width: W }}>
          Not enough data yet
        </Text>
      ) : (
        <Animated.View style={{ opacity }}>
          <Svg width={W} height={H}>
            <Polyline points={polylinePoints} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx={lastCoord[0]} cy={lastCoord[1]} r={3} fill={color} />
          </Svg>
        </Animated.View>
      )}

      {/* Latest label */}
      <Text variant="bodyStrong" style={{ minWidth: 38, textAlign: 'right' }}>
        {tooFew ? '—' : latestLabel ?? safePoints[safePoints.length - 1]}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={() => { impact('light'); onPress(); }}
        style={pressedStyle}
        accessibilityRole="button"
        accessibilityLabel={a11y}
      >
        <View style={{ backgroundColor: theme.card, borderRadius: radius.lg, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: theme.border }}>
          {inner}
        </View>
      </Pressable>
    );
  }

  return (
    <View style={{ backgroundColor: theme.card, borderRadius: radius.lg, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: theme.border }} accessibilityRole="text" accessibilityLabel={a11y}>
      {inner}
    </View>
  );
}
