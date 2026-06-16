import { useEffect, useRef } from 'react';
import { Animated, View, type ViewStyle } from 'react-native';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export function Skeleton({ height = 16, width = '100%', style }: { height?: number; width?: ViewStyle['width']; style?: ViewStyle }) {
  const { theme, isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { height, width, borderRadius: radius.sm, backgroundColor: isDark ? theme.cardElevated : theme.bgSubtle, opacity },
        style,
      ]}
    />
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
