import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgLinear, RadialGradient, Stop, Circle as SvgCircle } from 'react-native-svg';
import { SCREEN_W, NOTCH_R, heroBottomPath } from './curve-geometry';

/**
 * CURRENT · HeroAtmosphere — the emerald SKY.
 *
 * The hero ends in ONE clean concave curve (flat was wrong; it looked cut off).
 * The curve dips ~28px at center — like a premium dashboard surface wrapping
 * toward the instrument cluster. The Stats Bridge's top edge reads the exact
 * same curve, so the two form one continuous surface.
 *
 * Locked: glow, constellation, height, palette — all unchanged.
 */
export interface HeroAtmosphereProps {
  children: React.ReactNode;
}

export const HERO_CONTENT_H = 220;
/** Total hero height including the curve dip (paint area). */
export const HERO_H = HERO_CONTENT_H + NOTCH_R;

export function HeroAtmosphere({ children }: HeroAtmosphereProps) {
  // heroBottomPath returns: M 0 seamY ... L SCREEN_W seamY (left→right with bump)
  // We complete the shape by going up to top-right, across to top-left, then close.
  const curvePath = [
    heroBottomPath(HERO_CONTENT_H),
    `L ${SCREEN_W} 0`,
    `L 0 0`,
    `Z`,
  ].join(' ');

  return (
    <View style={{ position: 'relative', width: SCREEN_W, backgroundColor: 'transparent' }}>
      <Svg width={SCREEN_W} height={HERO_H} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
        <Defs>
          <SvgLinear id="skyBody" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#04140E" />
            <Stop offset="40%" stopColor="#06231A" />
            <Stop offset="100%" stopColor="#0B3A28" />
          </SvgLinear>
          <RadialGradient id="emeraldGlow" cx="50%" cy="28%" r="60%">
            <Stop offset="0%" stopColor="#34C98C" stopOpacity={0.42} />
            <Stop offset="45%" stopColor="#0F9F66" stopOpacity={0.16} />
            <Stop offset="100%" stopColor="#04140E" stopOpacity={0} />
          </RadialGradient>
        </Defs>

        <Path d={curvePath} fill="url(#skyBody)" />
        <Path d={curvePath} fill="url(#emeraldGlow)" />
      </Svg>

      <Constellation width={SCREEN_W} height={HERO_CONTENT_H} />

      <View style={{ position: 'relative', zIndex: 2 }}>{children}</View>
    </View>
  );
}

function Constellation({ width, height }: { width: number; height: number }) {
  const nodes = [
    { x: 0.18, y: 0.22, r: 1.4, o: 0.40 },
    { x: 0.36, y: 0.14, r: 1.8, o: 0.55 },
    { x: 0.64, y: 0.20, r: 1.5, o: 0.45 },
    { x: 0.82, y: 0.28, r: 1.6, o: 0.50 },
  ];
  const links: [number, number][] = [[1, 2]];

  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      {links.map(([a, b], i) => {
        const na = nodes[a], nb = nodes[b];
        return (
          <Path
            key={`l${i}`}
            d={`M ${na.x * width} ${na.y * height} L ${nb.x * width} ${nb.y * height}`}
            stroke="#34C98C" strokeWidth={0.5} strokeOpacity={0.12} fill="none"
          />
        );
      })}
      {nodes.map((n, i) => (
        <Svg key={`n${i}`}>
          <SvgCircle cx={n.x * width} cy={n.y * height} r={n.r * 3} fill="#34C98C" opacity={n.o * 0.10} />
          <SvgCircle cx={n.x * width} cy={n.y * height} r={n.r} fill="#E8FBF1" opacity={n.o * 0.85} />
        </Svg>
      ))}
    </Svg>
  );
}
