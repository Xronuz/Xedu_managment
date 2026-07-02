import { type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Signature element — emerald gradient header band (brend momenti). v2 */
export function HeroCard({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { theme, shadow } = useTheme();
  return (
    <View>
      <LinearGradient
        colors={[theme.heroFrom, theme.heroTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          { borderRadius: radius.xxl, padding: spacing.xl, ...shadow(2) },
          style,
        ]}
      >
        <View>{children}</View>
      </LinearGradient>
    </View>
  );
}
