import { useRef, type ReactNode } from 'react';
import { Animated, Platform, Pressable, View, type ViewStyle } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './text';
import { radius, spacing, anim, type ThemeColors } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact } from '@/lib/haptics';

export type DashTone = 'primary' | 'warning' | 'danger' | 'success' | 'info' | 'accent';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/* ═══════════════════════════════════════════════════════════════════
 *  Surface — tekis matte yuza (OPAQUE karta)
 * ═══════════════════════════════════════════════════════════════════ */
export function Surface({ children, onPress, style }: { children: ReactNode; onPress?: () => void; style?: ViewStyle }) {
  const { theme } = useTheme();
  const pressScale = useRef(new Animated.Value(1)).current;

  const base: ViewStyle = {
    backgroundColor: theme.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: theme.border,
    ...Platform.select<ViewStyle>({
      ios: { shadowColor: '#0B1F17', shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, shadowOpacity: 0.08 },
      android: { elevation: 2 },
      default: {},
    }),
  };

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={() => {
          impact('light');
          onPress();
        }}
        onPressIn={() => {
          Animated.spring(pressScale, {
            toValue: 0.985,
            damping: anim.spring.snappy.damping,
            stiffness: anim.spring.snappy.stiffness,
            mass: anim.spring.snappy.mass,
            useNativeDriver: true,
          }).start();
        }}
        onPressOut={() => {
          Animated.spring(pressScale, {
            toValue: 1,
            damping: anim.spring.rubbery.damping,
            stiffness: anim.spring.rubbery.stiffness,
            mass: anim.spring.rubbery.mass,
            useNativeDriver: true,
          }).start();
        }}
        style={({ pressed }) => [
          base,
          pressed ? { opacity: 0.88 } : null,
          { transform: [{ scale: pressScale }] },
          style,
        ]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <View style={[base, style]}>
      {children}
    </View>
  );
}

/** Yuklanish skeleti bloki. */
export function Skel({ w, h }: { w: number | `${number}%`; h: number }) {
  const { theme } = useTheme();
  return <View style={{ width: w, height: h, borderRadius: 6, backgroundColor: theme.bgSubtle }} />;
}

const tones = (theme: ThemeColors, tone: DashTone) => ({
  fg: theme[tone] as string,
  bg: theme[`${tone}Light` as keyof ThemeColors] as string,
});

/* ═══════════════════════════════════════════════════════════════════
 *  FocusBlock — "Diqqat markazi" — tone-rangli prominent actionable blok
 * ═══════════════════════════════════════════════════════════════════ */
export function FocusBlock({
  label, tone, icon, title, subtitle, onPress, loading,
}: { label: string; tone: DashTone; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress?: () => void; loading?: boolean }) {
  const { theme } = useTheme();
  const c = tones(theme, tone);

  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" color="textMuted">{label}</Text>
      <Surface onPress={onPress} style={{ padding: spacing.lg, borderColor: `${c.fg}33` }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: radius.lg,
              backgroundColor: c.bg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={icon} size={28} color={c.fg} />
          </View>
          <View style={{ flex: 1 }}>
            {loading ? (
              <View style={{ gap: 8 }}><Skel w="70%" h={15} /><Skel w="45%" h={11} /></View>
            ) : (
              <View>
                <Text variant="bodyStrong" numberOfLines={2}>{title}</Text>
                <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }} numberOfLines={2}>{subtitle}</Text>
              </View>
            )}
          </View>
          {onPress ? (
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          ) : null}
        </View>
      </Surface>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  DashMetric — Metrika kartasi (ikonga chip + katta qiymat + label)
 * ═══════════════════════════════════════════════════════════════════ */
export function DashMetric({ icon, label, value, tone = 'primary' }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number | string | null; tone?: DashTone }) {
  const { theme } = useTheme();
  const c = tones(theme, tone);
  return (
    <Surface style={{ flex: 1, padding: spacing.lg, gap: spacing.sm, minHeight: 110 }}>
      <View
        style={{ width: 42, height: 42, borderRadius: radius.md, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name={icon} size={21} color={c.fg} />
      </View>
      <Text variant="title" numberOfLines={1}>{value == null ? '—' : value}</Text>
      <Text variant="caption" color="textMuted" numberOfLines={1}>{label}</Text>
    </Surface>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  DashAction — Aksiya qatori (ikon + label + badge + chevron)
 * ═══════════════════════════════════════════════════════════════════ */
export function DashAction({ icon, label, badge, tone = 'warning', route }: { icon: keyof typeof Ionicons.glyphMap; label: string; badge?: number; tone?: DashTone; route: string }) {
  const { theme } = useTheme();
  const router = useRouter();
  const c = tones(theme, tone);
  return (
    <Surface
      onPress={() => {
        impact('light');
        router.push(route as Href);
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, minHeight: 60 }}
    >
      <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: theme.bgSubtle, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={20} color={theme.textSecondary} />
      </View>
      <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{label}</Text>
      {badge != null && badge > 0 ? (
        <View
          style={{ minWidth: 24, height: 24, paddingHorizontal: 7, borderRadius: radius.sm, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text variant="label" style={{ color: c.fg }}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
    </Surface>
  );
}
