import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/text';
import { radius, spacing, anim } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact } from '@/lib/haptics';
import { useReduceMotion } from './use-reduce-motion';
import { GradientOrb, type OrbTone } from './gradient-orb';

/**
 * CURRENT · Compass — the single dominant "do this now" action.
 *
 * v2 visual language: gradient card wash, glossy orb icon, layered shadow,
 * gradient CTA button. Premium consumer feel.
 *
 * See CURRENT_DESIGN_SYSTEM.md §3.
 */
export interface CompassProps {
  icon: keyof typeof Ionicons.glyphMap;
  emoji?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  rewardLabel?: string;
  ctaLabel: string;
  tone?: 'primary' | 'accent' | 'warning';
  onPress: () => void;
  completed?: boolean;
}

/** Apple-style premium card shadow: 18 blur, 8y offset, ~8% opacity, soft spread. */
function premiumCardShadow(isDark: boolean) {
  return {
    shadowColor: isDark ? '#000000' : '#0B3A28',
    shadowOpacity: isDark ? 0.5 : 0.10,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  };
}

type ToneKey = 'primary' | 'accent' | 'warning';

function toneWash(tone: ToneKey, isDark: boolean): [string, string] {
  switch (tone) {
    case 'accent': return isDark ? ['rgba(245,181,61,0.16)', 'rgba(245,181,61,0.02)'] : ['rgba(255,203,82,0.16)', 'rgba(255,203,82,0.02)'];
    case 'warning': return isDark ? ['rgba(251,191,36,0.14)', 'rgba(251,191,36,0.02)'] : ['rgba(255,198,88,0.18)', 'rgba(255,198,88,0.02)'];
    default: return isDark ? ['rgba(45,174,126,0.18)', 'rgba(45,174,126,0.02)'] : ['rgba(52,201,140,0.16)', 'rgba(52,201,140,0.02)'];
  }
}

function toneCTA(tone: ToneKey, isDark: boolean): [string, string] {
  switch (tone) {
    case 'accent': return ['#FFCB52', '#E08A12'];
    case 'warning': return ['#FFC658', '#F97316'];
    default: return isDark ? ['#34BC8A', '#1F8F62'] : ['#34C98C', '#0F9F66'];
  }
}

/** Pressable style factory — extracted to avoid TSX arrow-return parse ambiguity. */
const pressedStyle = ({ pressed }: { pressed: boolean }) => ({
  opacity: pressed ? 0.95 : 1,
  transform: [{ scale: pressed ? 0.985 : 1 }],
});

export function Compass({
  icon,
  emoji,
  eyebrow,
  title,
  subtitle,
  rewardLabel,
  ctaLabel,
  tone = 'primary',
  onPress,
  completed = false,
}: CompassProps) {
  const { theme, isDark } = useTheme();
  const reduce = useReduceMotion();
  const orbTone: OrbTone = completed ? 'primary' : tone;
  const wash = toneWash(tone, isDark);
  const ctaGrad = toneCTA(tone, isDark);

  // Mount slide-up + fade.
  const ty = useRef(new Animated.Value(reduce ? 0 : 14)).current;
  const op = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) return;
    Animated.parallel([
      Animated.timing(ty, { toValue: 0, duration: anim.duration.normal, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: anim.duration.normal, useNativeDriver: true }),
    ]).start();
  }, [reduce, ty, op]);

  // Urgency breathe on warning eyebrow.
  const breathe = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (tone !== 'warning' || completed || reduce) { breathe.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 0.6, duration: 1200, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [tone, completed, reduce, breathe]);

  const a11y = `${eyebrow ? eyebrow + ', ' : ''}${title}${subtitle ? ', ' + subtitle : ''}${rewardLabel ? ', reward ' + rewardLabel : ''}${completed ? ', done' : ''}`;

  return (
    <Animated.View style={[{ opacity: op, transform: [{ translateY: ty }] }, premiumCardShadow(isDark)]}>
      <Pressable
        onPress={() => { if (completed) return; impact('light'); onPress(); }}
        disabled={completed}
        style={pressedStyle}
        accessibilityRole="button"
        accessibilityLabel={a11y}
      >
        <View style={{
          backgroundColor: theme.card,
          borderRadius: radius.xxl,
          // No hard border — silhouette from shadow alone (carved, not stuck-on).
          padding: spacing.xl,
          overflow: 'hidden',
        }}>
          {/* Gradient wash overlay */}
          <LinearGradient
            colors={wash}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', inset: 0 }}
            pointerEvents="none"
          />

          {/* Header row: orb + reward */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
            <GradientOrb emoji={emoji} icon={icon} size={52} tone={orbTone} />
            <View style={{ flex: 1, paddingTop: 2 }}>
              {eyebrow ? (
                <Animated.Text
                  style={{
                    fontFamily: 'Manrope_600SemiBold', fontSize: 10, letterSpacing: 1.6,
                    textTransform: 'uppercase',
                    color: completed ? theme.textMuted : (tone === 'warning' ? theme.warning : theme.primary),
                    opacity: tone === 'warning' && !completed ? breathe : 1,
                  }}
                  numberOfLines={1}
                >
                  {eyebrow}
                </Animated.Text>
              ) : null}
              <Text variant="title" numberOfLines={3} style={{ marginTop: eyebrow ? 3 : 0 }}>
                {title}
              </Text>
            </View>
            {rewardLabel && !completed ? (
              <View style={{
                backgroundColor: theme.accentLight, borderRadius: radius.pill,
                paddingHorizontal: spacing.sm + 2, paddingVertical: 5,
                borderWidth: 1, borderColor: isDark ? 'rgba(245,181,61,0.2)' : 'rgba(199,125,17,0.12)',
              }}>
                <Text variant="label" style={{ color: theme.accent, fontSize: 12 }}>{rewardLabel}</Text>
              </View>
            ) : null}
          </View>

          {subtitle ? (
            <Text variant="body" color="textSecondary" style={{ marginTop: spacing.md }} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}

          {/* CTA */}
          {!completed ? (
            <View style={{ marginTop: spacing.xl }}>
              <LinearGradient
                colors={ctaGrad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{
                  borderRadius: radius.md, height: 52,
                  alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs,
                  shadowColor: ctaGrad[1], shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6,
                }}
              >
                <Text variant="bodyStrong" style={{ color: '#FFFFFF' }}>{ctaLabel}</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </LinearGradient>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md }}>
              <GradientOrb icon="checkmark" size={22} tone="primary" />
              <Text variant="label" color="primary">Bajarildi — zo'r ish</Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}
