import { useEffect, useRef } from 'react';
import { Text as RNText, type TextProps as RNTextProps, Animated } from 'react-native';
import { type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import type { ThemeColors } from '@/theme/tokens';

type Variant = keyof typeof type;

interface Props extends RNTextProps {
  variant?: Variant;
  /** Tema rang kaliti (`text`, `textMuted`, `primary` ...) yoki xom hex. */
  color?: keyof ThemeColors | (string & {});
  center?: boolean;
  /** Animated kirish (fade-in). Default: false */
  animated?: boolean;
}

export function Text({ variant = 'body', color = 'text', center, style, animated = false, ...rest }: Props) {
  const { theme } = useTheme();
  const resolved = (theme as Record<string, string>)[color as string] ?? color;

  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [animated, opacity]);

  const textNode = (
    <RNText
      style={[type[variant], { color: resolved }, center && { textAlign: 'center' }, style]}
      {...rest}
    />
  );

  if (animated) {
    return (
      <Animated.View style={{ opacity }}>
        {textNode}
      </Animated.View>
    );
  }

  return textNode;
}
