import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/text';
import { radius, spacing, anim } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact, success as successHaptic, warning as warningHaptic } from '@/lib/haptics';
import { useReduceMotion } from './use-reduce-motion';

/**
 * CURRENT · PathNode — one node on the student's learning path.
 *
 * Past = filled. Current = glowing, breathing. Future = dotted silhouette.
 * Makes the journey walkable and visible. Duolingo's skill node + the
 * "you are here" dot on a map.
 *
 * See CURRENT_DESIGN_SYSTEM.md §6.
 */
export type PathNodeState = 'done' | 'current' | 'locked';

export interface PathNodeProps {
  state: PathNodeState;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** Date or "Lesson 4". */
  sublabel?: string;
  /** "+15 XP" shown for current node. */
  rewardLabel?: string;
  /** Suppress the downward connector (last node). */
  isLast?: boolean;
  onPress?: () => void;
}

export function PathNode({
  state,
  icon,
  label,
  sublabel,
  rewardLabel,
  isLast = false,
  onPress,
}: PathNodeProps) {
  const { theme, shadow } = useTheme();
  const reduce = useReduceMotion();

  const isDone = state === 'done';
  const isCurrent = state === 'current';
  const isLocked = state === 'locked';

  const nodeSize = isCurrent ? 64 : 48;

  // Current node breathe (glow + scale).
  const breathe = useRef(new Animated.Value(reduce ? 1 : 1)).current;
  const glow = useRef(new Animated.Value(reduce ? 0.4 : 0.3)).current;
  useEffect(() => {
    if (!isCurrent || reduce) {
      breathe.setValue(1);
      glow.setValue(0.4);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(breathe, { toValue: 1.06, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.6, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(breathe, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.3, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isCurrent, reduce, breathe, glow]);

  // Locked shake on tap.
  const shake = useRef(new Animated.Value(0)).current;
  const triggerShake = () => {
    if (!isLocked || reduce) return;
    warningHaptic();
    Animated.sequence([
      Animated.timing(shake, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handlePress = () => {
    if (isLocked) {
      triggerShake();
      return;
    }
    impact('light');
    onPress?.();
  };

  // Connector color logic.
  const connectorColor = isDone ? theme.primary : isCurrent ? theme.primary : theme.bgSubtle;
  const connectorStyle: 'solid' | 'half' | 'dashed' =
    isDone ? 'solid' : isCurrent ? 'half' : 'dashed';

  const nodeBg = isDone ? theme.primary : isCurrent ? theme.primary : theme.bgSubtle;
  const nodeFg = isDone || isCurrent ? '#FFFFFF' : theme.textMuted;
  const nodeBorder = isLocked ? theme.border : 'transparent';
  const borderWidth = isLocked ? 2 : 0;
  const borderStyle = isLocked ? 'dashed' as const : 'solid' as const;

  const a11y = `${label}${sublabel ? ', ' + sublabel : ''}${rewardLabel ? ', ' + rewardLabel : ''}, ${isDone ? 'done' : isCurrent ? 'current' : 'locked — complete previous to unlock'}`;

  return (
    <View style={{ flexDirection: 'row' }}>
      {/* Node + connector column */}
      <View style={{ width: nodeSize, alignItems: 'center' }}>
        <Animated.View style={{ transform: [{ scale: isCurrent ? breathe : 1 }, { translateX: shake }] }}>
          {/* Glow */}
          {isCurrent ? (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: nodeSize,
                height: nodeSize,
                borderRadius: nodeSize / 2,
                backgroundColor: theme.primary,
                opacity: glow,
              }}
            />
          ) : null}
          <Pressable
            onPress={handlePress}
            style={({ pressed }) => {
              return {
              width: nodeSize,
              height: nodeSize,
              borderRadius: nodeSize / 2,
              backgroundColor: nodeBg,
              borderWidth,
              borderColor: nodeBorder,
              borderStyle,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed && !isLocked ? 0.95 : 1 }],
              };
            }}
            accessibilityRole={isLocked ? 'text' : 'button'}
            accessibilityLabel={a11y}
          >
            <Ionicons name={icon} size={isCurrent ? 30 : 22} color={nodeFg} />
          </Pressable>
        </Animated.View>

        {/* Downward connector */}
        {!isLast ? (
          <View
            style={{
              width: 2,
              height: spacing.xxl,
              backgroundColor: connectorStyle === 'dashed' ? 'transparent' : connectorColor,
              marginTop: spacing.xs,
              opacity: connectorStyle === 'half' ? 0.4 : 1,
              ...(connectorStyle === 'dashed'
                ? { borderLeftWidth: 2, borderLeftColor: theme.bgSubtle, borderStyle: 'dashed' as const, width: 0 }
                : {}),
            }}
          />
        ) : null}
      </View>

      {/* Label column */}
      <View style={{ flex: 1, paddingTop: spacing.xs, marginLeft: spacing.md }}>
        {isCurrent && rewardLabel ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 2 }}>
            <View style={{ backgroundColor: theme.accentLight, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 1 }}>
              <Text variant="label" style={{ color: theme.accent, fontSize: 11 }}>{rewardLabel}</Text>
            </View>
          </View>
        ) : null}
        <Text variant="bodyStrong" style={{ color: isLocked ? theme.textMuted : theme.text }} numberOfLines={2}>
          {label}
        </Text>
        {sublabel ? (
          <Text variant="caption" color="textMuted" style={{ marginTop: 1 }}>{sublabel}</Text>
        ) : null}
        {isCurrent ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary }} />
            <Text variant="label" style={{ color: theme.primary, fontSize: 11, letterSpacing: 0.5 }}>YOU ARE HERE</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * LearningPath — vertical composition of PathNode. The walkable journey.
 */
export function LearningPath({ children, style }: { children: React.ReactNode; style?: View['props']['style'] }) {
  return <View style={[{ gap: 0 }, style]}>{children}</View>;
}
