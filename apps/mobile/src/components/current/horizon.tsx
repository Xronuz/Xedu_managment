import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/text';
import { radius, spacing, anim } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { useReduceMotion } from './use-reduce-motion';

/**
 * CURRENT · Horizon — the level progress line.
 *
 * Makes the future visible: the student always knows what level they're at
 * and what milestone they're walking toward. Replaces bare level numbers.
 * XP bar at the bottom of a game HUD + a named next destination.
 *
 * See CURRENT_DESIGN_SYSTEM.md §5.
 */
export interface HorizonProps {
  level: number;
  /** Progress within current level, 0..1. */
  progress: number;
  xpCurrent?: number;
  xpNeeded?: number;
  /** e.g. "Math Maverick" or "Level 7". */
  nextMilestoneLabel?: string;
  /** Header variant — just bar + level chip, no milestone text. */
  compact?: boolean;
}

export function Horizon({
  level,
  progress,
  xpCurrent,
  xpNeeded,
  nextMilestoneLabel,
  compact = false,
}: HorizonProps) {
  const { theme, isDark } = useTheme();
  const reduce = useReduceMotion();
  const p = Math.max(0, Math.min(1, progress || 0));

  const width = useRef(new Animated.Value(reduce ? p : 0)).current;
  useEffect(() => {
    if (reduce) {
      width.setValue(p);
      return;
    }
    const inst = Animated.timing(width, {
      toValue: p,
      duration: anim.duration.slow,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width interpolation
    });
    inst.start();
    return () => inst.stop();
  }, [p, reduce, width]);

  const barHeight = compact ? 4 : 6;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 1, now: p }}
      accessibilityLabel={`Level ${level}, ${Math.round(p * 100)} percent to ${nextMilestoneLabel ?? 'next level'}`}
    >
      {/* Top row: level chip + milestone label */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs }}>
        <View
          style={{
            backgroundColor: theme.primaryLight,
            borderRadius: radius.pill,
            paddingVertical: 3,
            paddingHorizontal: spacing.sm + 2,
          }}
        >
          <Text variant="label" style={{ color: theme.primary, fontSize: 12 }}>
            Lv.{level}
          </Text>
        </View>
        {!compact && nextMilestoneLabel ? (
          <Text variant="caption" color="textMuted" numberOfLines={1} style={{ flex: 1, marginLeft: spacing.sm, textAlign: 'right' }}>
            {nextMilestoneLabel}
          </Text>
        ) : null}
      </View>

      {/* Track + animated fill */}
      <View style={{ position: 'relative' }}>
        {/* soft glow under the bar */}
        {!reduce && p > 0.02 && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute', top: -3, left: 0,
              height: barHeight + 6,
              width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              borderRadius: radius.pill,
              backgroundColor: theme.primary, opacity: 0.25, filter: [{ blur: 6 }],
            }}
          />
        )}
        <View style={{ height: barHeight, backgroundColor: theme.bgSubtle, borderRadius: radius.pill, overflow: 'hidden' }}>
          <Animated.View
            style={{
              height: barHeight,
              borderRadius: radius.pill,
              width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }}
          >
            <LinearGradient
              colors={isDark ? ['#5BD6A4', '#2DAE7E', '#1F8F62'] : ['#5BD6A4', '#0F9F66', '#076540']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
            {/* top sheen on the fill */}
            <LinearGradient
              colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%' }}
            />
          </Animated.View>
        </View>
      </View>

      {/* Optional numeric XP hint */}
      {!compact && xpCurrent != null && xpNeeded != null ? (
        <Text variant="caption" color="textMuted" style={{ marginTop: spacing.xs }}>
          {xpCurrent}/{xpNeeded} XP
        </Text>
      ) : null}
    </View>
  );
}
