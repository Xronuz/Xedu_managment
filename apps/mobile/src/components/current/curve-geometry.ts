import { Dimensions } from 'react-native';

/**
 * XEDU · Signature Notch Motif — ONE mathematically clean semicircle.
 *
 * No waves. No diagonals. No freeform curves. Exactly one shared semicircle
 * governs the hero↔content transition, like two puzzle pieces locking:
 *
 *   GREEN hero:    convex semicircle bulging DOWN
 *   WHITE content: matching CONCAVE semicircle (same center, same radius)
 *
 * Both share center (cx, seamY) and radius NOTCH_R, so they interlock with
 * zero gap and zero overlap. The stats live in the bridge band between them.
 */

export const SCREEN_W = Dimensions.get('window').width;

/** The single shared semicircle radius. */
export const NOTCH_R = 90;
/** Center x = screen center. */
export const cx = () => SCREEN_W / 2;
/** Left/right x where the semicircle meets the flat edge. */
export const notchLeft = () => cx() - NOTCH_R;
export const notchRight = () => cx() + NOTCH_R;

/**
 * Hero bottom path: flat from (0,seamY) to (notchLeft,seamY), then a convex
 * semicircle bulging DOWN to (notchRight,seamY), then flat to (W,seamY).
 *
 * `seamY` is where the hero's flat edge sits. The arc dips to seamY + NOTCH_R.
 */
export function heroBottomPath(seamY: number, width: number = SCREEN_W): string {
  const L = notchLeft(), R = notchRight();
  // A rx ry xRot largeArc sweep x y  —  sweep=1 (clockwise) → dips DOWN for L→R
  return `M 0 ${seamY} L ${L} ${seamY} A ${NOTCH_R} ${NOTCH_R} 0 0 1 ${R} ${seamY} L ${width} ${seamY}`;
}

/**
 * Stats Bridge path: top edge is the MIRROR concave semicircle (same center,
 * same radius) — it receives the hero's convex bulge. Bottom edge is FLAT.
 * The band height is the space where stats sit.
 *
 * Local coords: y=0 = bridge top (= hero seamY globally). Bridge fills DOWNWARD
 * from the concave curve to a flat bottom at `bandH`.
 */
export function bridgePath(bandH: number, width: number = SCREEN_W): string {
  const L = notchLeft(), R = notchRight();
  // Top: concave — arc dips DOWN at center (receives hero bulge).
  return [
    `M 0 0`,
    `L ${L} 0`,
    `A ${NOTCH_R} ${NOTCH_R} 0 0 1 ${R} 0`,
    `L ${width} 0`,
    `L ${width} ${bandH}`,
    `L 0 ${bandH}`,
    `Z`,
  ].join(' ');
}

/**
 * Mission card subtle notch — repeats the motif, very shallow.
 * depth 12–18px, centered, no dramatic cutout. Card itself is not resized;
 * this only paints a small emerald concave arc over the card's top edge.
 */
export const NOTCH_CARD_DEPTH = 14;
export const NOTCH_CARD_HALF_W = 56;

/** Legacy alias — NOTCH_R bilan bir xil. */
export const CURVE_DIP = NOTCH_R;

/** Legacy alias — heroBottomPath bilan bir xil. */
export const heroBottomCurve = heroBottomPath;

/** Concave arc path for the card's top notch (drawn as a stroke). */
export function cardNotchArc(cardTopY: number, cardW: number): string {
  const cxC = cardW / 2;
  const L = cxC - NOTCH_CARD_HALF_W;
  const R = cxC + NOTCH_CARD_HALF_W;
  // sweep=0 going L→R → dips UP into the card (concave from above).
  return `M ${L} ${cardTopY} A ${NOTCH_CARD_HALF_W} ${NOTCH_CARD_HALF_W} 0 0 0 ${R} ${cardTopY}`;
}
