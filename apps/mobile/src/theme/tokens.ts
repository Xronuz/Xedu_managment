import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Xedu dizayn tokenlari — brendi web bilan bir xil (emerald-green #0F7B53).
 * Web manbasi: apps/frontend/src/app/globals.css (--xedu-*).
 *
 * v2 — zamonaviy: animation spring/duration, glass variantlari, dark mode shadow.
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

  // ── Immersiv (Liquid Glass / referens uslubi) — LIGHT = myata gradient ──
  immFrom: '#CBEFDC',
  immVia: '#A8E3C6',
  immTo: '#6FC79C',
  immText: '#06291A',
  immTextMuted: 'rgba(6, 41, 26, 0.62)',
  immGlass: 'rgba(255, 255, 255, 0.72)',
  immGlassStrong: 'rgba(255, 255, 255, 0.88)',
  immBorder: 'rgba(255, 255, 255, 0.95)',
  immAccent: '#0E8A52',
  immAccentText: '#FFFFFF',
  immChip: 'rgba(14, 138, 82, 0.14)',
  immSpark: 'rgba(14, 138, 82, 0.40)',
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

  // ── Immersiv (referens uslubi) — DARK = to'q o'rmon-yashil gradient ──
  immFrom: '#0E3A29',
  immVia: '#0B2A1E',
  immTo: '#04130C',
  immText: '#FFFFFF',
  immTextMuted: 'rgba(255, 255, 255, 0.62)',
  immGlass: 'rgba(255, 255, 255, 0.08)',
  immGlassStrong: 'rgba(255, 255, 255, 0.15)',
  immBorder: 'rgba(255, 255, 255, 0.18)',
  immAccent: '#84E78E',
  immAccentText: '#06251A',
  immChip: 'rgba(255, 255, 255, 0.10)',
  immSpark: 'rgba(132, 231, 142, 0.45)',
};

export type ThemeColors = typeof lightColors;

/* ═══════════════════════════════════════════════════════════════════
 *  Spacing — 4px grid
 * ═══════════════════════════════════════════════════════════════════ */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
} as const;

/* ═══════════════════════════════════════════════════════════════════
 *  Border Radius
 * ═══════════════════════════════════════════════════════════════════ */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
  pill: 999,
} as const;

/* ═══════════════════════════════════════════════════════════════════
 *  Fonts
 * ═══════════════════════════════════════════════════════════════════ */
export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

/* ═══════════════════════════════════════════════════════════════════
 *  Typography — rang-neytral matn stillari (rang ekranда qo'shiladi)
 * ═══════════════════════════════════════════════════════════════════ */
export const type = {
  overline: { fontFamily: fonts.semibold, fontSize: 10, lineHeight: 14, letterSpacing: 1.5, textTransform: 'uppercase' as const },
  label: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  body: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  heading: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 },
  display: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 36 },
} satisfies Record<string, TextStyle>;

/* ═══════════════════════════════════════════════════════════════════
 *  Animation — spring konfiguratsiyalar va duration'lar
 *  React Native Animated API uchun
 * ═══════════════════════════════════════════════════════════════════ */
export const anim = {
  /** Spring konfiguratsiyalar */
  spring: {
    gentle:  { damping: 20, stiffness: 140, mass: 1 },     // yumshoq, tab switch
    bouncy:  { damping: 12, stiffness: 200, mass: 0.8 },  // bounce, badge
    snappy:  { damping: 24, stiffness: 300, mass: 0.6 },   // tezkor, button press
    rubbery: { damping: 15, stiffness: 120, mass: 1.2 },   // kauchuk, card press
    slow:    { damping: 28, stiffness: 100, mass: 1 },     // sekin, page enter
  },
  /** Timing duration'lar (ms) */
  duration: {
    instant: 80,
    fast: 150,
    normal: 250,
    slow: 400,
    crawl: 600,
  },
  /** Easing funktsiyalari (Bezier cubic) */
  easing: {
    standard: [0.4, 0, 0.2, 1],
    decel: [0, 0, 0.2, 1],
    accel: [0.4, 0, 1, 1],
    sharp: [0.4, 0, 0.6, 1],
  },
} as const;

/* ═══════════════════════════════════════════════════════════════════
 *  Glass — Liquid Glass 2.0 tokenlari
 * ═══════════════════════════════════════════════════════════════════ */
export const glass = {
  /** BlurView intensity (iOS) */
  blur: { light: 60, dark: 40 },
  /** Surface opacity */
  opacity: { light: 0.65, dark: 0.45 },
  /** Chekka border rang */
  border: { light: 'rgba(255,255,255,0.65)', dark: 'rgba(255,255,255,0.12)' },
  /** Emerald gradient overlay opacity */
  emeraldOverlay: 0.15,
  /** Standart radius */
  radius: 28,
  /** Variant-sozlangan konfiguratsiyalar */
  variants: {
    default:  { radius: 28, blur: 60, opacity: { light: 0.65, dark: 0.45 } },
    nav:      { radius: 32, blur: 80, opacity: { light: 0.72, dark: 0.55 } },
    card:     { radius: 24, blur: 50, opacity: { light: 0.60, dark: 0.40 } },
    elevated: { radius: 28, blur: 40, opacity: { light: 0.80, dark: 0.60 } },
    subtle:   { radius: 20, blur: 30, opacity: { light: 0.50, dark: 0.30 } },
  },
} as const;

/* ═══════════════════════════════════════════════════════════════════
 *  Elevatsiya — iOS shadow + Android elevation
 * ═══════════════════════════════════════════════════════════════════ */
export function shadow(level: 0 | 1 | 2 | 3, isDark: boolean): ViewStyle {
  if (level === 0) return {};

  if (isDark) {
    // Dark mode — subtle glow instead of shadow
    const map = {
      1: { opacity: 0.04, elevation: 1 },
      2: { opacity: 0.06, elevation: 3 },
      3: { opacity: 0.10, elevation: 6 },
    } as const;
    const s = map[level];
    return {
      shadowColor: '#2DAE7E',
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 12,
      shadowOpacity: s.opacity,
      elevation: s.elevation,
    };
  }

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
