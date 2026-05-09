'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════════
   WORKSPACE CONTEXT SYSTEM
   Split-context architecture for performance under institutional scale.

   Problem: A single context causes ALL consumers to rerender on ANY state change.
   Solution: Three independent contexts so components subscribe only to what they use.

   Usage:
     import { useWorkspacePanel, useWorkspaceSelection, useWorkspaceOps } from './workspace-context';

   Backward compatible:
     useWorkspace() still returns all three combined.
   ═══════════════════════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────────────────────────
   PANEL CONTEXT — slide-over panel state
   Consumers: EntityPanel, row click handlers
   ────────────────────────────────────────────────────────────────────────────── */

interface PanelState {
  panelOpen: boolean;
  panelEntityType: string | null;
  panelEntityId: string | null;
}

interface PanelContextValue {
  state: PanelState;
  openPanel: (entityType: string, entityId: string) => void;
  closePanel: () => void;
}

const defaultPanelState: PanelState = {
  panelOpen: false,
  panelEntityType: null,
  panelEntityId: null,
};

const PanelContext = createContext<PanelContextValue | null>(null);

function usePanelContext() {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error('useWorkspacePanel must be used within WorkspaceProvider');
  return ctx;
}

/* ──────────────────────────────────────────────────────────────────────────────
   SELECTION CONTEXT — bulk selection state
   Consumers: OpTable, FloatingBulkToolbar
   ────────────────────────────────────────────────────────────────────────────── */

interface SelectionState {
  selectedIds: string[];
  lastSelectedId: string | null;
}

interface SelectionContextValue {
  state: SelectionState;
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setSelectedIds: (ids: string[]) => void;
}

const defaultSelectionState: SelectionState = {
  selectedIds: [],
  lastSelectedId: null,
};

const SelectionContext = createContext<SelectionContextValue | null>(null);

function useSelectionContext() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error('useWorkspaceSelection must be used within WorkspaceProvider');
  return ctx;
}

/* ──────────────────────────────────────────────────────────────────────────────
   OPERATIONS CONTEXT — filters, search, compare
   Consumers: WorkspaceToolbar, filter chips, search inputs
   ────────────────────────────────────────────────────────────────────────────── */

interface OpsState {
  compareMode: boolean;
  compareIds: string[];
  activeFilters: Record<string, string | string[]>;
  searchQuery: string;
  searchScope: string;
}

interface OpsContextValue {
  state: OpsState;
  toggleCompareMode: () => void;
  toggleCompareId: (id: string) => void;
  clearCompare: () => void;
  setFilter: (key: string, value: string | string[] | null) => void;
  clearFilters: () => void;
  setSearchQuery: (q: string) => void;
  setSearchScope: (scope: string) => void;
  clearSearch: () => void;
}

const defaultOpsState: OpsState = {
  compareMode: false,
  compareIds: [],
  activeFilters: {},
  searchQuery: '',
  searchScope: 'all',
};

const OpsContext = createContext<OpsContextValue | null>(null);

function useOpsContext() {
  const ctx = useContext(OpsContext);
  if (!ctx) throw new Error('useWorkspaceOps must be used within WorkspaceProvider');
  return ctx;
}

/* ──────────────────────────────────────────────────────────────────────────────
   PROVIDER — composes all three contexts
   ────────────────────────────────────────────────────────────────────────────── */

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [panelState, setPanelState] = useState<PanelState>(defaultPanelState);
  const [selectionState, setSelectionState] = useState<SelectionState>(defaultSelectionState);
  const [opsState, setOpsState] = useState<OpsState>(defaultOpsState);

  /* Panel actions */
  const openPanel = useCallback((entityType: string, entityId: string) => {
    setPanelState({ panelOpen: true, panelEntityType: entityType, panelEntityId: entityId });
  }, []);

  const closePanel = useCallback(() => {
    setPanelState(defaultPanelState);
  }, []);

  const panelValue = useMemo(() => ({
    state: panelState,
    openPanel,
    closePanel,
  }), [panelState, openPanel, closePanel]);

  /* Selection actions */
  const toggleSelect = useCallback((id: string) => {
    setSelectionState((s) => {
      const has = s.selectedIds.includes(id);
      const selectedIds = has
        ? s.selectedIds.filter((x) => x !== id)
        : [...s.selectedIds, id];
      return { selectedIds, lastSelectedId: id };
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectionState((s) => ({ ...s, selectedIds: ids }));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectionState({ selectedIds: [], lastSelectedId: null });
  }, []);

  const setSelectedIds = useCallback((ids: string[]) => {
    setSelectionState((s) => ({ ...s, selectedIds: ids }));
  }, []);

  const selectionValue = useMemo(() => ({
    state: selectionState,
    toggleSelect,
    selectAll,
    clearSelection,
    setSelectedIds,
  }), [selectionState, toggleSelect, selectAll, clearSelection, setSelectedIds]);

  /* Ops actions */
  const toggleCompareMode = useCallback(() => {
    setOpsState((s) => ({
      ...s,
      compareMode: !s.compareMode,
      compareIds: !s.compareMode ? s.compareIds : [],
    }));
  }, []);

  const toggleCompareId = useCallback((id: string) => {
    setOpsState((s) => {
      const has = s.compareIds.includes(id);
      const compareIds = has
        ? s.compareIds.filter((x) => x !== id)
        : [...s.compareIds, id];
      return { ...s, compareIds };
    });
  }, []);

  const clearCompare = useCallback(() => {
    setOpsState((s) => ({ ...s, compareMode: false, compareIds: [] }));
  }, []);

  const setFilter = useCallback((key: string, value: string | string[] | null) => {
    setOpsState((s) => {
      const activeFilters = { ...s.activeFilters };
      if (value === null) delete activeFilters[key];
      else activeFilters[key] = value;
      return { ...s, activeFilters };
    });
  }, []);

  const clearFilters = useCallback(() => {
    setOpsState((s) => ({ ...s, activeFilters: {} }));
  }, []);

  const setSearchQuery = useCallback((q: string) => {
    setOpsState((s) => ({ ...s, searchQuery: q }));
  }, []);

  const setSearchScope = useCallback((scope: string) => {
    setOpsState((s) => ({ ...s, searchScope: scope }));
  }, []);

  const clearSearch = useCallback(() => {
    setOpsState((s) => ({ ...s, searchQuery: '', searchScope: 'all' }));
  }, []);

  const opsValue = useMemo(() => ({
    state: opsState,
    toggleCompareMode,
    toggleCompareId,
    clearCompare,
    setFilter,
    clearFilters,
    setSearchQuery,
    setSearchScope,
    clearSearch,
  }), [opsState, toggleCompareMode, toggleCompareId, clearCompare, setFilter, clearFilters, setSearchQuery, setSearchScope, clearSearch]);

  return (
    <PanelContext.Provider value={panelValue}>
      <SelectionContext.Provider value={selectionValue}>
        <OpsContext.Provider value={opsValue}>
          {children}
        </OpsContext.Provider>
      </SelectionContext.Provider>
    </PanelContext.Provider>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   HOOKS — prefer specific hooks; useWorkspace() for backward compatibility
   ────────────────────────────────────────────────────────────────────────────── */

export function useWorkspacePanel() {
  return usePanelContext();
}

export function useWorkspaceSelection() {
  return useSelectionContext();
}

export function useWorkspaceOps() {
  return useOpsContext();
}

/** @deprecated Prefer useWorkspacePanel, useWorkspaceSelection, or useWorkspaceOps for performance */
export function useWorkspace() {
  const panel = usePanelContext();
  const selection = useSelectionContext();
  const ops = useOpsContext();

  return useMemo(() => ({
    state: {
      ...panel.state,
      ...selection.state,
      ...ops.state,
    },
    openPanel: panel.openPanel,
    closePanel: panel.closePanel,
    toggleSelect: selection.toggleSelect,
    selectAll: selection.selectAll,
    clearSelection: selection.clearSelection,
    setSelectedIds: selection.setSelectedIds,
    toggleCompareMode: ops.toggleCompareMode,
    toggleCompareId: ops.toggleCompareId,
    clearCompare: ops.clearCompare,
    setFilter: ops.setFilter,
    clearFilters: ops.clearFilters,
    setSearchQuery: ops.setSearchQuery,
    setSearchScope: ops.setSearchScope,
    clearSearch: ops.clearSearch,
  }), [panel, selection, ops]);
}
