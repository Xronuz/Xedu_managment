import { Pressable, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/**
 * CURRENT · GradientOrb — XEDU's signature iconographic identity.
 *
 * A glossy gradient squircle with a sphere highlight. The signature treatment
 * applied to every icon in the system, so all screens share one visual
 * language. Native emoji ride on top for a true sculptural 3D feel without
 * shipping any asset bundle. Think iOS app-icon depth inside the UI.
 *
 * Premium consumer feel, not enterprise icon-in-a-box.
 */
export type OrbTone = 'primary' | 'accent' | 'warning' | 'info' | 'neutral';

/** Pressable style factory — extracted to avoid TSX arrow-return parse ambiguity. */
const pressedStyle = ({ pressed }: { pressed: boolean }) => ({
  opacity: pressed ? 0.9 : 1,
  transform: [{ scale: pressed ? 0.94 : 1 }],
});

export interface GradientOrbProps {
  /**
   * Premium SF-symbol-style icon (Ionicons glyph). This IS the iconography —
   * no emoji. The glossy gradient orb is the 3D illustration; the white glyph
   * is the meaning. (emoji prop kept for source-compat but ignored in v3.)
   */
  emoji?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** diameter: 28–80. */
  size?: number;
  tone?: OrbTone;
  /** Render a faint ring (for locked / resting states). */
  ringed?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

function toneStops(tone: OrbTone, isDark: boolean): [string, string, string] {
  switch (tone) {
    case 'primary':
      return isDark ? ['#34BC8A', '#1F8F62', '#0F5A3B'] : ['#34C98C', '#0F9F66', '#076540'];
    case 'accent':
      return isDark ? ['#F5B53D', '#C77D11', '#7A4A05'] : ['#FFCB52', '#E08A12', '#9C580A'];
    case 'warning':
      return isDark ? ['#FBBF24', '#F97316', '#B4380A'] : ['#FFC658', '#F97316', '#C2410C'];
    case 'info':
      return isDark ? ['#60A5FA', '#2563EB', '#1E3A8A'] : ['#5B9BFF', '#2563EB', '#1E40AF'];
    default:
      return isDark ? ['#3A4A42', '#26332C', '#15201B'] : ['#E8EEEB', '#C8D2CD', '#A8B6AE'];
  }
}

export function GradientOrb({
  emoji,
  icon = 'ellipse',
  size = 48,
  tone = 'neutral',
  ringed = false,
  onPress,
  style,
}: GradientOrbProps) {
  const { theme, isDark } = useTheme();
  const [c1, c2, c3] = toneStops(tone, isDark);

  const iconSize = Math.round(size * 0.46);

  // squircle-ish via large radius relative to size
  const r = size >= 56 ? size * 0.34 : size * 0.38;

  const inner = (
    <View style={[{ width: size, height: size }, style]}>
      {/* ring for locked/resting */}
      {ringed ? (
        <View style={{
          position: 'absolute', inset: 0, borderRadius: r,
          borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.border,
        }} />
      ) : null}

      {/* gloss base */}
      <LinearGradient
        colors={[c1, c2, c3]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={{
          position: 'absolute', inset: 0, borderRadius: r,
          // soft outer shadow baked via container instead (platform-correct)
        }}
      />

      {/* sphere top sheen */}
      <LinearGradient
        colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
        style={{ position: 'absolute', top: 1, left: size * 0.12, right: size * 0.12, height: size * 0.42, borderRadius: r }}
      />

      {/* inner bottom shadow for volume */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.22)']}
        start={{ x: 0.5, y: 0.55 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: size * 0.5, borderRadius: r }}
      />

      {/* glyph — premium SF-symbol style. No emoji. */}
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons
          name={icon}
          size={iconSize}
          color={'#FFFFFF'}
          style={{ opacity: tone === 'neutral' ? 0.7 : 1 }}
        />
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={pressedStyle}
      >
        {inner}
      </Pressable>
    );
  }
  return inner;
}
