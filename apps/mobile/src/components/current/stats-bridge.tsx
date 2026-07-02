import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgLinear, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/text';
import { spacing } from '@/theme/tokens';
import { SCREEN_W, CURVE_DIP, bridgePath } from './curve-geometry';

/**
 * CURRENT · StatsBridge — carved INTO the hero's curve.
 *
 * The bridge's TOP edge is the exact mirror of the hero's concave bottom curve
 * (shared geometry → zero gap, one continuous surface). Its bottom is FLAT so
 * the mission card plugs in flush. The stats are carved into the emerald — no
 * pills, no badges, no cards. Dashboard plastic wrapping an instrument cluster.
 *
 * Locked: stats content, palette (same emerald as hero), dividers.
 */
export interface StatsBridgeProps {
  streak: number;
  level: number;
  coins: number;
}

/** Height of the flat stats band (below the curve). */
export const BRIDGE_BAND_H = 56;
/** Total bridge height including the curve dip. */
export const BRIDGE_H = BRIDGE_BAND_H + CURVE_DIP;

export function StatsBridge({ streak, level, coins }: StatsBridgeProps) {
  // The bridge starts where the hero's curve starts (nominally at y=0 here,
  // positioned in the layout). Top edge = shared curve; bottom = flat.
  const path = bridgePath(BRIDGE_BAND_H, SCREEN_W);

  return (
    <View style={{ width: SCREEN_W, height: BRIDGE_H, position: 'relative' }}>
      <Svg width={SCREEN_W} height={BRIDGE_H} style={{ position: 'absolute', top: 0, left: 0 }}>
        <Defs>
          <SvgLinear id="bridgeBody" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#0B3A28" />
            <Stop offset="60%" stopColor="#08291C" />
            <Stop offset="100%" stopColor="#04140E" />
          </SvgLinear>
        </Defs>
        <Path d={path} fill="url(#bridgeBody)" />
        {/* faint top sheen where curve meets hero (continuity cue) */}
        <Path d={bridgePath(BRIDGE_BAND_H, SCREEN_W)} fill="none" stroke="rgba(91,214,164,0.08)" strokeWidth={1} />
      </Svg>

      {/* Carved stats — instrument cluster */}
      <View style={{
        position: 'absolute',
        // sit the stats in the flat band, below the curve dip
        top: CURVE_DIP + 14,
        left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly',
        paddingHorizontal: spacing.xl,
      }}>
        <CarvedStat icon="flame" value={streak} label="streak" />
        <Divider />
        <CarvedStat icon="star" value={level} label="level" />
        <Divider />
        <CarvedStat icon="ribbon" value={coins} label="coins" />
      </View>
    </View>
  );
}

function CarvedStat({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: number; label: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ionicons name={icon} size={13} color="#5BD6A4" />
        <Text variant="bodyStrong" style={{ color: '#FFFFFF', fontSize: 16 }}>{value}</Text>
      </View>
      <Text variant="overline" style={{ color: 'rgba(232,251,241,0.45)', fontSize: 8.5, letterSpacing: 1 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={{ width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.08)' }} />;
}
