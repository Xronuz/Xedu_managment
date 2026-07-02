import { type ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact } from '@/lib/haptics';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  /** 0 = chegara, soyasiz; 1 = yumshoq soya; 2 = o'rtacha soya */
  elevation?: 0 | 1 | 2;
  padded?: boolean;
  /** Karta varianti */
  variant?: 'default' | 'flat';
  style?: ViewStyle;
}

export function Card({
  children,
  onPress,
  elevation = 1,
  padded = true,
  variant = 'default',
  style,
}: Props) {
  const { theme, shadow, isDark } = useTheme();

  const base: ViewStyle = {
    backgroundColor: theme.card,
    borderRadius: radius.lg,
    borderWidth: variant === 'flat' ? 0 : 1,
    borderColor: variant === 'flat' ? 'transparent' : theme.border,
    padding: padded ? spacing.lg : 0,
    ...shadow(elevation === 0 ? 0 : elevation),
  };

  // Dark mode subtle gradient
  const darkGradientStyle: ViewStyle | undefined = isDark
    ? { borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.04)' }
    : undefined;

  if (onPress) {
    return (
      <Pressable
        onPress={() => {
          impact('light');
          onPress();
        }}
        style={({ pressed }) => [
          base,
          darkGradientStyle,
          pressed
            ? { opacity: 0.88, transform: [{ scale: 0.985 }] }
            : { opacity: 1 },
          style,
        ]}
        android_ripple={{ color: theme.border, borderless: false }}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[base, darkGradientStyle, style]}>
      {children}
    </View>
  );
}
