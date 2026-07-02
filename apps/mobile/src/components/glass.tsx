import { type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { glass as glassTokens, radius, spacing, type ThemeColors } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const IS_IOS = Platform.OS === 'ios';

/** Glass variant turlari — har biri oz sozlamalariga ega. */
export type GlassVariant = 'default' | 'nav' | 'card' | 'elevated' | 'subtle';

/** Apple soft shadow — premium "suzuvchi" his. */
function glassShadow(): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0B1F17',
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 26,
      shadowOpacity: 0.16,
    },
    android: { elevation: 12 },
    default: {},
  })!;
}

/**
 * Liquid Glass 2.0 — Xedu signature yuza.
 *
 * Variantlar:
 * - `default`  — standart glass (blur 60, radius 28)
 * - `nav`      — navigatsiya bar (kuchliroq blur 80, radius 32)
 * - `card`     — kartalar (o'rtacha blur 50, radius 24)
 * - `elevated` — balandlik kartalari (yuqori opacity, radius 28)
 * - `subtle`   — nozik glass (past blur 30, radius 20)
 *
 * iOS — haqiqiy BlurView.
 * Android — blur'siz premium gradient surface + emerald ambient.
 *
 * Foydalanish: Faqat FOKUS yuzalarda (nav, focus card, FAB, sheet) — 15% qoida.
 */
export function Glass({
  children,
  onPress,
  style,
  variant = 'default',
  intensity,
  emerald = false,
  bright = false,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: GlassVariant;
  /** Blur intensity override (iOS). Agar berilmasa — variant tanlaydi. */
  intensity?: number;
  /** Emerald gradient overlay — brend identifikatsiya. */
  emerald?: boolean;
  /** Yuqori intensivlik (iOS BlurView) — nav uchun. */
  bright?: boolean;
}) {
  const { theme, isDark } = useTheme();

  // Variant sozlamalarini olish
  const v = glassTokens.variants[variant];
  const r = v.radius;
  const blurVal = intensity ?? (IS_IOS ? v.blur : 0);
  const opLight = v.opacity.light;
  const opDark = v.opacity.dark;

  // Android'da deyarli to'liq shaffofmas (tiniq), iOS'da haqiqiy yarim-shaffof shisha
  const surface = isDark
    ? `rgba(24,42,34,${IS_IOS ? 0.55 : 0.97})`
    : `rgba(255,255,255,${IS_IOS ? opLight : 0.96})`;

  const borderColor = isDark
    ? (glassTokens.border.dark as string)
    : (glassTokens.border.light as string);

  const inner = (
    <View style={{ borderRadius: r, overflow: 'hidden' }}>
      {/* iOS — haqiqiy blur */}
      {IS_IOS ? (
        <BlurView
          intensity={bright ? blurVal + 20 : blurVal}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {/* Base surface — har ikki platformada */}
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: surface }]}
        pointerEvents="none"
      />

      {/* Android — gradient overlay (blur o'rniga vizual depth) */}
      {!IS_IOS && isDark && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: 'rgba(45, 174, 126, 0.06)',
              borderTopWidth: 0.5,
              borderLeftWidth: 0.5,
              borderColor: 'rgba(132, 231, 142, 0.10)',
              borderRadius: r,
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Emerald gradient overlay — brend identifikatsiya */}
      {emerald ? (
        <LinearGradient
          colors={[
            `${theme.primary}26`,
            `${theme.primary}10`,
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.85, y: 0.85 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}

      {/* Glass chekka border — yuqori va chap tomon (yorug'lik hissi) */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: r,
            borderTopWidth: 0.5,
            borderLeftWidth: 0.5,
            borderColor,
          },
        ]}
        pointerEvents="none"
      />

      {/* Pastki border — anchagina aniqroq (depth) */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: r,
            borderBottomWidth: isDark ? 0.5 : 0,
            borderRightWidth: isDark ? 0.5 : 0,
            borderColor: isDark ? 'rgba(0,0,0,0.2)' : 'transparent',
          },
        ]}
        pointerEvents="none"
      />

      {children}
    </View>
  );

  const outer: ViewStyle = { borderRadius: r, ...glassShadow() };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          outer,
          pressed
            ? { opacity: 0.92, transform: [{ scale: 0.985 }] }
            : null,
          style,
        ]}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View style={[outer, style]}>
      {inner}
    </View>
  );
}
