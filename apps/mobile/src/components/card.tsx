import { type ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  /** 0 = chegara, soyasiz; 1 = yumshoq soya */
  elevation?: 0 | 1 | 2;
  padded?: boolean;
  style?: ViewStyle;
}

export function Card({ children, onPress, elevation = 1, padded = true, style }: Props) {
  const { theme, shadow } = useTheme();
  const base: ViewStyle = {
    backgroundColor: theme.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: padded ? spacing.lg : 0,
    ...shadow(elevation === 0 ? 0 : 1),
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [base, pressed && { opacity: 0.7 }, style]}
        android_ripple={{ color: theme.border }}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}
