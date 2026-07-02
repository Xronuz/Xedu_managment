import { View } from 'react-native';
import Svg, { Circle, Rect, G } from 'react-native-svg';
import { Text } from './text';
import { fonts, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export interface Segment {
  value: number;
  color: string;
  label: string;
}

/** Donut/ring diagramma (tarkib). react-native-svg — Expo Go'да ishlaydi. */
export function DonutChart({ segments, size = 160, strokeWidth = 22, centerLabel, centerValue }: { segments: Segment[]; size?: number; strokeWidth?: number; centerLabel?: string; centerValue?: string }) {
  const { theme } = useTheme();
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <View style={{ alignItems: 'center', gap: spacing.md }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.border} strokeWidth={strokeWidth} fill="none" />
            {segments.map((seg, i) => {
              const len = (Math.max(0, seg.value) / total) * circ;
              const el = (
                <Circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={`${len} ${circ - len}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += len;
              return el;
            })}
          </G>
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          {centerValue ? <Text style={{ fontFamily: fonts.extrabold, fontSize: 22, color: theme.text }}>{centerValue}</Text> : null}
          {centerLabel ? <Text variant="caption" color="textMuted">{centerLabel}</Text> : null}
        </View>
      </View>
      <View style={{ gap: 6, alignSelf: 'stretch' }}>
        {segments.map((seg, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: seg.color }} />
            <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>{seg.label}</Text>
            <Text variant="caption" style={{ color: theme.text, fontFamily: fonts.semibold }}>{seg.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Vertikal bar diagramma (taqqoslash). */
export function BarChart({ data, height = 160, barColor }: { data: { label: string; value: number }[]; height?: number; barColor?: string }) {
  const { theme } = useTheme();
  const color = barColor ?? theme.primary;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = 26;
  const gap = 14;
  const chartH = height - 28;
  const width = data.length * (barW + gap) + gap;

  return (
    <View>
      <Svg width={width} height={height}>
        {data.map((d, i) => {
          const h = Math.max(2, (d.value / max) * chartH);
          const x = gap + i * (barW + gap);
          return <Rect key={i} x={x} y={chartH - h} width={barW} height={h} rx={6} fill={color} opacity={0.9} />;
        })}
      </Svg>
      <View style={{ flexDirection: 'row', marginTop: -22 }}>
        {data.map((d, i) => (
          <View key={i} style={{ width: barW + gap, marginLeft: i === 0 ? gap : 0, alignItems: 'center' }}>
            <Text variant="label" color="textMuted" numberOfLines={1}>{d.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
