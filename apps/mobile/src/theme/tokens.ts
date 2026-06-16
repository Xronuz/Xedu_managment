import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Xedu dizayn tokenlari — brendi web bilan bir xil (emerald-green #0F7B53).
 * Web manbasi: apps/frontend/src/app/globals.css (--xedu-*).
 */

export const lightColors = {
  bg: '#F4F6F5',
  bgSubtle: '#EDEFF2',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',

  text: '#111827',
  textSecondary: '#475569',
  textMuted: '#64748B',

  border: 'rgba(15, 23, 42, 0.08)',
  borderStrong: 'rgba(15, 23, 42, 0.14)',

  primary: '#0F7B53',
  primaryHover: '#0D6B48',
  primaryLight: '#DDF5EA',
  primaryMuted: '#E6F5EE',
  onPrimary: '#FFFFFF',
  primaryText: '#FFFFFF', // legacy alias

  accent: '#C77D11', // tangalar / mukofot (gold)
  accentLight: '#FBEFD6',

  success: '#15935F',
  successLight: '#E6F5EE',
  danger: '#DC2626',
  dangerLight: '#FCE8E8',
  warning: '#C2410C',
  warningLight: '#FCEEE3',
  info: '#2563EB',
  infoLight: '#E6EDFC',

  heroFrom: '#0C3A28',
  heroTo: '#11774F',
  onHero: '#FFFFFF',
  onHeroMuted: 'rgba(255, 255, 255, 0.72)',
};

export const darkColors: typeof lightColors = {
  bg: '#0B1411',
  bgSubtle: '#0E1A15',
  card: '#14211B',
  cardElevated: '#182A22',

  text: '#ECF3EF',
  textSecondary: '#AEBCB4',
  textMuted: '#7E8C84',

  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.16)',

  primary: '#2DAE7E',
  primaryHover: '#34BC8A',
  primaryLight: 'rgba(45, 174, 126, 0.16)',
  primaryMuted: 'rgba(45, 174, 126, 0.10)',
  onPrimary: '#05231A',
  primaryText: '#05231A',

  accent: '#F5B53D',
  accentLight: 'rgba(245, 181, 61, 0.16)',

  success: '#2DAE7E',
  successLight: 'rgba(45, 174, 126, 0.16)',
  danger: '#F87171',
  dangerLight: 'rgba(248, 113, 113, 0.16)',
  warning: '#FBBF24',
  warningLight: 'rgba(251, 191, 36, 0.16)',
  info: '#60A5FA',
  infoLight: 'rgba(96, 165, 250, 0.16)',

  heroFrom: '#0A3324',
  heroTo: '#125C40',
  onHero: '#ECF3EF',
  onHeroMuted: 'rgba(236, 243, 239, 0.70)',
};

export type ThemeColors = typeof lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

/** Rang-neytral matn stillari (rang ekranда qo'shiladi). */
export const type = {
  display: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34 },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 },
  heading: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  body: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
} satisfies Record<string, TextStyle>;

/** Elevatsiya (iOS shadow + Android elevation). */
export function shadow(level: 0 | 1 | 2 | 3, isDark: boolean): ViewStyle {
  if (level === 0 || isDark) return {};
  const map = {
    1: { height: 1, radius: 3, opacity: 0.06, elevation: 1 },
    2: { height: 4, radius: 12, opacity: 0.08, elevation: 3 },
    3: { height: 10, radius: 24, opacity: 0.12, elevation: 8 },
  } as const;
  const s = map[level];
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: s.height },
      shadowRadius: s.radius,
      shadowOpacity: s.opacity,
    },
    android: { elevation: s.elevation },
    default: {},
  })!;
}
