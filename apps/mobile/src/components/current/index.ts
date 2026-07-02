/**
 * CURRENT Design System — XEDU Student Experience.
 *
 * Motion-first primitives that make XEDU feel like motion, not storage.
 * Every student screen composes from these. See docs/design/CURRENT_DESIGN_SYSTEM.md.
 *
 * Import from a single barrel:
 *   import { DayRing, Compass, Pulse, Horizon } from '@/components/current';
 */

// Soul — daily completeness ring
export { DayRing } from './day-ring';
export type { DayRingProps } from './day-ring';

// The single dominant action
export { Compass } from './compass';
export type { CompassProps } from './compass';

// Living stat chips
export { Pulse, PulseRow } from './pulse';
export type { PulseProps, PulseTone } from './pulse';

// Level progress line
export { Horizon } from './horizon';
export type { HorizonProps } from './horizon';

// Subject growth sparkline
export { Continuum, deriveDirection } from './continuum';
export type { ContinuumProps, ContinuumDirection } from './continuum';

// Homework as quest
export { QuestCard } from './quest-card';
export type { QuestCardProps, QuestStatus } from './quest-card';

// Growth-framed moment feed
export { LedgerEntry, Ledger } from './ledger-entry';
export type { LedgerEntryProps, LedgerTone } from './ledger-entry';

// Achievement tiles
export { TrophyTile, TrophyCase } from './trophy-tile';
export type { TrophyTileProps } from './trophy-tile';

// Walkable learning path
export { PathNode, LearningPath } from './path-node';
export type { PathNodeProps, PathNodeState } from './path-node';

// Shared hook
export { useReduceMotion } from './use-reduce-motion';

// Composites (reusable across every screen — not screen-specific widgets)
export { SectionLabel } from './section-label';
export type { SectionLabelProps } from './section-label';

// Signature visual treatments (v2 visual language)
export { GradientOrb } from './gradient-orb';
export type { GradientOrbProps, OrbTone } from './gradient-orb';
export { HeroAtmosphere } from './hero-atmosphere';
export type { HeroAtmosphereProps } from './hero-atmosphere';
export { HERO_H, HERO_CONTENT_H } from './hero-atmosphere';
export { RingStat, RingStatRow } from './ring-stat';
export type { RingStatProps } from './ring-stat';
export { StatsBridge } from './stats-bridge';
export type { StatsBridgeProps } from './stats-bridge';
export { BRIDGE_H, BRIDGE_BAND_H } from './stats-bridge';
export { CURVE_DIP, SCREEN_W, heroBottomCurve, bridgePath } from './curve-geometry';

// Pure logic
export { computeMission, computeRing } from './mission-engine';
export type { MissionInput, MissionOutput } from './mission-engine';
