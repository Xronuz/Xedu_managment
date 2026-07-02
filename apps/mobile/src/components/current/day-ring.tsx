import { useEffect, useRef } from 'react';
import { Animated, Easing as RNEasing, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/text';
import { anim, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { useReduceMotion } from './use-reduce-motion';

/**
 * CURRENT · DayRing — the soul of the Home screen.
 *
 * v4 art direction: the stats live INSIDE the ring (Variant C). The hero
 * becomes ONE object — no collision between a stats row and the mission card
 * below. The ring center shows MEANINGFUL progress, not decoration:
 *   - centerLabel  : the headline (e.g. "2 / 3")
 *   - centerCaption: what it measures (e.g. "BUGUNGI MAQSAD")
 *   - children     : the inline stat row (streak · level · coins), centered
 *
 * Gradient stroke (emerald → teal → deep), ambient glow, sculptural depth.
 *
 * See CURRENT_DESIGN_SYSTEM.md §2.
 */
export interface DayRingProps {
  done: number;
  total: number;
  /** Headline in the center, e.g. "2 / 3" or "0%". Derived as `${done}/${total}` if omitted. */
  centerLabel?: string;
  /** What the headline measures, e.g. "BUGUNGI MAQSAD" / "TODAY'S GOAL". */
  centerCaption?: string;
  /** Diameter: 120 / 180 / 240. Default 'lg'. */
  size?: 'sm' | 'md' | 'lg';
  tone?: 'primary' | 'accent';
  onComplete?: () => void;
  accessibleLabel?: string;
  /** Inline stat row rendered inside the ring, under the caption. Variant C. */
  children?: React.ReactNode;
  /**
   * Surface the ring sits on.
   * - 'light' (default): bgSubtle track, dark text — for light page content.
   * - 'dark': dark inner pod, white text, translucent white track — the
   *   instrument-cluster pod that straddles the hero curve.
   */
  surface?: 'light' | 'dark';
}

const SIZE_PX = { sm: 104, md: 146, lg: 240 } as const;
const STROKE = { sm: 7, md: 12, lg: 18 } as const;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function DayRing({
  done,
  total,
  centerLabel,
  centerCaption = 'TODAY',
  size = 'lg',
  tone = 'primary',
  onComplete,
  accessibleLabel,
  children,
  surface = 'light',
}: DayRingProps) {
  const { theme } = useTheme();
  const reduce = useReduceMotion();
  const onDark = surface === 'dark';

  const px = SIZE_PX[size];
  const stroke = STROKE[size];
  const r = (px - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;

  const safeTotal = Math.max(1, total);
  const safeDone = Math.max(0, Math.min(safeTotal, done));
  const ratio = safeTotal > 0 ? safeDone / safeTotal : 0;
  const isComplete = safeTotal > 0 && safeDone >= safeTotal;
  const isRest = total < 1;

  const targetOffset = isRest ? circ : circ * (1 - ratio);
  const offset = useRef(new Animated.Value(reduce ? targetOffset : circ)).current;

  useEffect(() => {
    if (reduce) { offset.setValue(targetOffset); return; }
    const inst = Animated.timing(offset, {
      toValue: targetOffset, duration: anim.duration.slow,
      easing: RNEasing.out(RNEasing.cubic), useNativeDriver: true,
    });
    inst.start();
    return () => inst.stop();
  }, [targetOffset, reduce, offset]);

  const completedRef = useRef(isComplete);
  useEffect(() => {
    if (isComplete && !completedRef.current) { completedRef.current = true; onComplete?.(); }
    if (!isComplete) completedRef.current = false;
  }, [isComplete, onComplete]);

  const glowOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isComplete || reduce) { glowOpacity.setValue(0); return; }
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.35, duration: 1600, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.15, duration: 1600, useNativeDriver: true }),
      ])
    ).start();
  }, [isComplete, reduce, glowOpacity]);

  const gradId = `ring-${tone}-${size}`;
  const headline = centerLabel ?? (isRest ? '—' : `${safeDone}/${safeTotal}`);
  const glowColor = tone === 'accent' ? theme.accent : theme.primary;

  return (
    <View
      style={{ width: px, height: px, alignItems: 'center', justifyContent: 'center' }}
      accessibilityRole="image"
      accessibilityLabel={accessibleLabel ?? `${safeDone} of ${safeTotal} done today`}
    >
      {/* Ambient glow disc */}
      {!reduce && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', width: px * 0.92, height: px * 0.92, borderRadius: (px * 0.92) / 2,
            backgroundColor: glowColor, opacity: Animated.add(glowOpacity, 0.08),
          }}
        />
      )}

      <Svg width={px} height={px} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={tone === 'accent' ? '#FFCB52' : '#5BD6A4'} />
            <Stop offset="55%" stopColor={tone === 'accent' ? '#E08A12' : '#0F9F66'} />
            <Stop offset="100%" stopColor={tone === 'accent' ? '#9C580A' : '#076540'} />
          </LinearGradient>
        </Defs>
        <G rotation={-90} origin={`${px / 2}, ${px / 2}`}>
          <Circle
            cx={px / 2} cy={px / 2} r={r}
            stroke={onDark ? 'rgba(255,255,255,0.10)' : theme.bgSubtle}
            strokeWidth={stroke} fill="none" strokeLinecap="round"
          />
          {!isRest && (
            <AnimatedCircle
              cx={px / 2} cy={px / 2} r={r}
              stroke={`url(#${gradId})`} strokeWidth={stroke} fill="none" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={offset}
            />
          )}
        </G>
      </Svg>

      {/* Inner frosted disc for depth */}
      <View style={{
        position: 'absolute', width: px - stroke * 4, height: px - stroke * 4,
        borderRadius: (px - stroke * 4) / 2,
        backgroundColor: onDark ? 'rgba(4,20,14,0.55)' : 'rgba(255,255,255,0.04)',
        borderWidth: 1, borderColor: onDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,123,83,0.06)',
      }} />

      {/* Center content — MEANINGFUL progress + inline stats */}
      <View style={{ alignItems: 'center', gap: 0, paddingHorizontal: 16 }}>
        {isComplete ? (
          <Ionicons
            name="checkmark-done"
            size={size === 'lg' ? 30 : 22}
            color={onDark ? '#5BD6A4' : theme.primary}
            style={{ marginBottom: 2 }}
          />
        ) : null}
        <Text
          variant={size === 'lg' ? 'display' : size === 'md' ? 'title' : 'heading'}
          style={{ color: isRest ? (onDark ? 'rgba(232,251,241,0.5)' : theme.textMuted) : (onDark ? '#FFFFFF' : theme.text) }}
        >
          {headline}
        </Text>
        <Text
          variant="overline"
          style={{ letterSpacing: 1.5, marginTop: 2, color: onDark ? 'rgba(232,251,241,0.6)' : theme.textMuted }}
        >
          {isRest ? 'REST DAY' : centerCaption}
        </Text>
        {/* Inline stat row — Variant C */}
        {children ? (
          <View style={{ marginTop: spacing.sm + 2, alignItems: 'center' }}>
            {children}
          </View>
        ) : null}
      </View>
    </View>
  );
}
