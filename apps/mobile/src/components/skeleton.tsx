import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { radius, spacing, anim } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Shimmer effect bilan skeleton — zamonaviy gradient skeleton. */
export function Skeleton({ height = 16, width = '100%', style }: { height?: number; width?: ViewStyle['width']; style?: ViewStyle }) {
  const { theme, isDark } = useTheme();
  const translateX = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: 400,
        duration: anim.duration.slow * 3,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [translateX]);

  const baseColor = isDark ? theme.cardElevated : theme.bgSubtle;
  const highlightColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)';

  return (
    <View style={[{ height, width, borderRadius: radius.sm, backgroundColor: baseColor, overflow: 'hidden' }, style]}>
      <Animated.View
        style={{
          width: '40%',
          height: '100%',
          transform: [{ translateX: translateX }],
        }}
      >
        <LinearGradient
          colors={[baseColor, highlightColor, baseColor]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>
    </View>
  );
}

/** Ro'yxat skeletoni — kartalar shaklida (yakuniy layoutga mos). */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  const { theme } = useTheme();
  return (
    <View style={{ padding: spacing.lg, gap: spacing.md }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={{
            backgroundColor: theme.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: theme.border,
            padding: spacing.lg,
            gap: spacing.sm,
          }}
        >
          <Skeleton height={15} width="55%" />
          <Skeleton height={12} width="35%" />
        </View>
      ))}
    </View>
  );
}
