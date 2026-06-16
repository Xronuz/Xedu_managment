import { useColorScheme } from 'react-native';
import { darkColors, lightColors, shadow, type ThemeColors } from './tokens';
import { useThemeStore } from './theme-store';

export interface AppTheme {
  /** Rang tokenlari (ekranlar `theme.bg`, `theme.primary` ... ishlatadi). */
  theme: ThemeColors;
  isDark: boolean;
  /** Elevatsiya helper — `shadow(2)` */
  shadow: (level: 0 | 1 | 2 | 3) => ReturnType<typeof shadow>;
}

export function useTheme(): AppTheme {
  const system = useColorScheme();
  const mode = useThemeStore((s) => s.mode);
  const isDark = mode === 'system' ? system === 'dark' : mode === 'dark';
  const theme = isDark ? darkColors : lightColors;
  return {
    theme,
    isDark,
    shadow: (level) => shadow(level, isDark),
  };
}
