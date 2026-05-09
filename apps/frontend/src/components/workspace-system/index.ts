export { WorkspaceProvider, useWorkspace, useWorkspacePanel, useWorkspaceSelection, useWorkspaceOps } from './workspace-context';
export {
  WorkspaceShell,
  WorkspaceHeader,
  WorkspaceToolbar,
  WorkspaceMain,
  WorkspaceSidebar,
  WorkspacePanel,
  WorkspaceBottom,
  WorkspaceSection,
} from './workspace-shell';
export { OpTable } from './op-table';
export type { OpColumn, TableDensity, RowTone, OpTableProps } from './op-table';
export {
  PrimaryAction,
  SecondaryAction,
  TertiaryAction,
  DestructiveAction,
  IconAction,
  ActionGroup,
  ActionBar,
  ContextualActions,
} from './action-bar';
export { CommandPalette, useCommandPalette } from './command-palette';
export type { CommandItem } from './command-palette';
export { EntityPanel } from './entity-panel';
export type { EntityType, EntityPanelProps } from './entity-panel';
export { useMobileWorkspace } from './use-mobile-workspace';
export {
  StatPill,
  QuickLink,
  InfoItem,
  EmptyState,
  LoadingSurface,
  SectionLabel,
} from './workspace-helpers';
export type { StatTone } from './workspace-helpers';
export { StatusBadge, StatusDot } from './status-badge';
export type { StatusVariant } from './status-badge';
export {
  chartAttendance,
  chartFinance,
  chartAcademic,
  chartDiscipline,
  chartNeutral,
  chartRisk,
  chartPremium,
  chartColorSequence,
  chartFillOpacity,
} from './chart-palette';
export type { ChartPalette } from './chart-palette';
export { useDebouncedValue } from './use-debounced-value';
export { useVirtualization } from './use-virtualization';
export { MemoChart } from './memo-chart';
export { RealtimePulse } from './realtime-pulse';
export {
  FamilyShell,
  FamilyHeader,
  FamilyQuickStats,
  FamilyMain,
  FamilySidebar,
} from './family-shell';
export {
  StudentShell,
  StudentHeader,
  StudentDayBlock,
  StudentProgress,
} from './student-shell';
export { AcademicEmptyState } from './academic-empty-state';
