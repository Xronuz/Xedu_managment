'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════════
   WORKSPACE CONTEXT
   Global workspace state management for panels, selections, comparisons,
   and contextual surfaces. Role-agnostic.
   ═══════════════════════════════════════════════════════════════════════════════ */

export interface WorkspaceState {
  /* Panel state */
  panelOpen: boolean;
  panelEntityType: string | null;
  panelEntityId: string | null;

  /* Selection state */
  selectedIds: string[];
  lastSelectedId: string | null;

  /* Comparison state */
  compareMode: boolean;
  compareIds: string[];

  /* Filters */
  activeFilters: Record<string, string | string[]>;

  /* Search */
  searchQuery: string;
  searchScope: string;
}

interface WorkspaceContextValue {
  state: WorkspaceState;

  /* Panel actions */
  openPanel: (entityType: string, entityId: string) => void;
  closePanel: () => void;

  /* Selection actions */
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setSelectedIds: (ids: string[]) => void;

  /* Comparison actions */
  toggleCompareMode: () => void;
  toggleCompareId: (id: string) => void;
  clearCompare: () => void;

  /* Filter actions */
  setFilter: (key: string, value: string | string[] | null) => void;
  clearFilters: () => void;

  /* Search actions */
  setSearchQuery: (q: string) => void;
  setSearchScope: (scope: string) => void;
  clearSearch: () => void;
}

const defaultState: WorkspaceState = {
  panelOpen: false,
  panelEntityType: null,
  panelEntityId: null,
  selectedIds: [],
  lastSelectedId: null,
  compareMode: false,
  compareIds: [],
  activeFilters: {},
  searchQuery: '',
  searchScope: 'all',
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkspaceState>(defaultState);

  const openPanel = useCallback((entityType: string, entityId: string) => {
    setState((s) => ({
      ...s,
      panelOpen: true,
      panelEntityType: entityType,
      panelEntityId: entityId,
    }));
  }, []);

  const closePanel = useCallback(() => {
    setState((s) => ({
      ...s,
      panelOpen: false,
      panelEntityType: null,
      panelEntityId: null,
    }));
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setState((s) => {
      const has = s.selectedIds.includes(id);
      const selectedIds = has
        ? s.selectedIds.filter((x) => x !== id)
        : [...s.selectedIds, id];
      return { ...s, selectedIds, lastSelectedId: id };
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setState((s) => ({ ...s, selectedIds: ids }));
  }, []);

  const clearSelection = useCallback(() => {
    setState((s) => ({ ...s, selectedIds: [], lastSelectedId: null }));
  }, []);

  const setSelectedIds = useCallback((ids: string[]) => {
    setState((s) => ({ ...s, selectedIds: ids }));
  }, []);

  const toggleCompareMode = useCallback(() => {
    setState((s) => ({
      ...s,
      compareMode: !s.compareMode,
      compareIds: !s.compareMode ? s.compareIds : [],
    }));
  }, []);

  const toggleCompareId = useCallback((id: string) => {
    setState((s) => {
      const has = s.compareIds.includes(id);
      const compareIds = has
        ? s.compareIds.filter((x) => x !== id)
        : [...s.compareIds, id];
      return { ...s, compareIds };
    });
  }, []);

  const clearCompare = useCallback(() => {
    setState((s) => ({ ...s, compareMode: false, compareIds: [] }));
  }, []);

  const setFilter = useCallback((key: string, value: string | string[] | null) => {
    setState((s) => {
      const activeFilters = { ...s.activeFilters };
      if (value === null) delete activeFilters[key];
      else activeFilters[key] = value;
      return { ...s, activeFilters };
    });
  }, []);

  const clearFilters = useCallback(() => {
    setState((s) => ({ ...s, activeFilters: {} }));
  }, []);

  const setSearchQuery = useCallback((q: string) => {
    setState((s) => ({ ...s, searchQuery: q }));
  }, []);

  const setSearchScope = useCallback((scope: string) => {
    setState((s) => ({ ...s, searchScope: scope }));
  }, []);

  const clearSearch = useCallback(() => {
    setState((s) => ({ ...s, searchQuery: '', searchScope: 'all' }));
  }, []);

  const value = useMemo(
    () => ({
      state,
      openPanel,
      closePanel,
      toggleSelect,
      selectAll,
      clearSelection,
      setSelectedIds,
      toggleCompareMode,
      toggleCompareId,
      clearCompare,
      setFilter,
      clearFilters,
      setSearchQuery,
      setSearchScope,
      clearSearch,
    }),
    [state, openPanel, closePanel, toggleSelect, selectAll, clearSelection, setSelectedIds, toggleCompareMode, toggleCompareId, clearCompare, setFilter, clearFilters, setSearchQuery, setSearchScope, clearSearch]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
