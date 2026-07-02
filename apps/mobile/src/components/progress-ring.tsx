import { useEffect, useRef, type ReactNode } from 'react';
import { View, Animated, Easing as RNEasing } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Yagona-yoy progress halqasi (Apple Fitness uslubi) — daraja/davomat uchun.
 *
 * RN Animated bilan native driver animatsiya (SVG strokeDashoffset uchun eng mos).
 */
export function ProgressRing({
  size = 64,
  strokeWidth = 6,
  progress,
  color,
  track,
  glow = false,
  animate = true,
  children,
}: {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0..1
  color: string;
  track: string;
  /** Glow effect — progress atrofida yorug'lik halqasi */
  glow?: boolean;
  animate?: boolean;
  children?: ReactNode;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress || 0));
  const target = circ * (1 - p); // strokeDashoffset: circ = bo'sh, circ*(1-p) = to'lgan

  const offset = useRef(new Animated.Value(animate ? circ : target)).current;

  useEffect(() => {
    if (!animate) {
      offset.setValue(target);
      return;
    }
    // SVG strokeDashoffset animatsiya — native driver bilan
    const animInstance = Animated.timing(offset, {
      toValue: target,
      duration: 900,
      easing: RNEasing.out(RNEasing.cubic),
      useNativeDriver: true,
    });
    animInstance.start();
    return () => animInstance.stop();
  }, [target, animate, offset, circ]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          {/* Track — orqa halqa */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={track}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
          {/* Progress halqasi */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            // Glow filter
            {...(glow ? { filter: 'drop-shadow(0 0 6px rgba(15, 123, 83, 0.4))' } : {})}
          />
        </G>
      </Svg>
      {children}
    </View>
  );
}
