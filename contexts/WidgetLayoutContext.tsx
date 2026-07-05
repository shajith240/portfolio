// contexts/WidgetLayoutContext.tsx
"use client";

import { createContext, useContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { TOP_BOUND, BOTTOM_RESERVE } from "@/contexts/WindowManagerContext";
import {
  clampCell,
  computeGridSpec,
  resolveCellCollision,
  spanForSize,
  type Cell,
  type GridSpec,
  type Occupancy,
} from "@/lib/widgetPositioning";
import {
  WIDGET_IDS,
  STORAGE_KEY,
  computeDefaultLayout,
  parseStoredLayout,
  serializeLayout,
  type WidgetId,
  type WidgetSize,
  type WidgetLayout,
} from "@/lib/widgetLayoutSchema";

interface WidgetLayoutContextValue {
  layout: WidgetLayout;
  spec: GridSpec;
  isEditing: boolean;
  enterEditMode: () => void;
  exitEditMode: () => void;
  moveWidget: (id: WidgetId, cell: Cell) => void;
  resizeWidget: (id: WidgetId, size: WidgetSize, cell: Cell) => void;
  resetLayout: () => void;
}

const WidgetLayoutContext = createContext<WidgetLayoutContextValue | null>(null);

// try/catch around every localStorage call — private browsing, quota
// errors, or storage-disabled contexts fall back to in-memory-only
// (edits work for the session, just don't persist), never a thrown
// error or broken UI.
function readStoredLayoutRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredLayoutRaw(value: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage unavailable — the in-memory state this session already
    // has is the visitor's working layout; it just won't survive a
    // reload. Nothing else to do here.
  }
}

function clearStoredLayoutRaw() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Same as above — nothing to recover from if storage is blocked.
  }
}

function currentSpec(): GridSpec {
  return computeGridSpec(window.innerWidth, window.innerHeight, TOP_BOUND, BOTTOM_RESERVE);
}

// Re-fit an existing layout onto a (possibly different) lattice —
// used on window resize, where a shrinking column count can push
// widgets off the lattice or into each other. Order is WIDGET_IDS
// order, same as parseStoredLayout, so refits are deterministic.
function refitLayout(layout: WidgetLayout, spec: GridSpec): WidgetLayout {
  const next = {} as WidgetLayout;
  const occupied: Occupancy[] = [];
  let changed = false;
  for (const id of WIDGET_IDS) {
    const entry = layout[id];
    const span = spanForSize(entry.size);
    const cell = resolveCellCollision(spec, clampCell(spec, entry, span), span, occupied);
    next[id] = cell.col === entry.col && cell.row === entry.row ? entry : { ...entry, col: cell.col, row: cell.row };
    if (next[id] !== entry) changed = true;
    occupied.push({ cell, span });
  }
  return changed ? next : layout;
}

export function WidgetLayoutProvider({ children }: { children: ReactNode }) {
  const [layout, setLayout] = useState<WidgetLayout | null>(null);
  const [spec, setSpec] = useState<GridSpec | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Load once on mount — SSR-safe "null until mounted" convention.
  useEffect(() => {
    const mountSpec = currentSpec();
    const defaults = computeDefaultLayout(mountSpec);
    setSpec(mountSpec);
    setLayout(parseStoredLayout(readStoredLayoutRaw(), defaults, mountSpec));
  }, []);

  // Window resize recomputes the lattice; cell coordinates survive
  // unchanged unless the new lattice is too small for them, in which
  // case refitLayout nudges the affected widgets to the nearest legal
  // cells.
  useEffect(() => {
    const handleResize = () => {
      const nextSpec = currentSpec();
      setSpec(nextSpec);
      setLayout((prev) => (prev ? refitLayout(prev, nextSpec) : prev));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const persist = useCallback((next: WidgetLayout) => {
    writeStoredLayoutRaw(serializeLayout(next));
  }, []);

  const enterEditMode = useCallback(() => setIsEditing(true), []);
  const exitEditMode = useCallback(() => setIsEditing(false), []);

  // moveWidget/resizeWidget receive the DESIRED cell (the caller's
  // best-effort pick — WidgetFrame computes this from its own
  // otherRects prop, which is a snapshot taken at render time). That
  // snapshot can be one render stale — e.g. two drags landing in the
  // same React batch — so the actual authority for "is this cell
  // free" lives HERE, inside the setState updater, built fresh from
  // `prev` (the one value guaranteed current at the instant of
  // commit). Re-resolving against a snapshot's own decision is
  // idempotent when the snapshot was already correct, and is the only
  // thing that closes the race when it wasn't — this is what makes
  // "widgets never overlap" actually hold under concurrent drags,
  // not just under a single isolated one.
  const moveWidget = useCallback(
    (id: WidgetId, desired: Cell) => {
      setLayout((prev) => {
        if (!prev || !spec) return prev;
        const span = spanForSize(prev[id].size);
        const occupied: Occupancy[] = WIDGET_IDS.filter((other) => other !== id).map((other) => ({
          cell: { col: prev[other].col, row: prev[other].row },
          span: spanForSize(prev[other].size),
        }));
        const cell = resolveCellCollision(spec, clampCell(spec, desired, span), span, occupied);
        const next = { ...prev, [id]: { ...prev[id], col: cell.col, row: cell.row } };
        persist(next);
        return next;
      });
    },
    [persist, spec]
  );

  const resizeWidget = useCallback(
    (id: WidgetId, size: WidgetSize, desired: Cell) => {
      setLayout((prev) => {
        if (!prev || !spec) return prev;
        const span = spanForSize(size);
        const occupied: Occupancy[] = WIDGET_IDS.filter((other) => other !== id).map((other) => ({
          cell: { col: prev[other].col, row: prev[other].row },
          span: spanForSize(prev[other].size),
        }));
        const cell = resolveCellCollision(spec, clampCell(spec, desired, span), span, occupied);
        const next = { ...prev, [id]: { col: cell.col, row: cell.row, size } };
        persist(next);
        return next;
      });
    },
    [persist, spec]
  );

  const resetLayout = useCallback(() => {
    clearStoredLayoutRaw();
    const nextSpec = currentSpec();
    setSpec(nextSpec);
    setLayout(computeDefaultLayout(nextSpec));
  }, []);

  // Memoized — 5 WidgetFrame consumers mount off this one provider,
  // and a drag/resize updates layout frequently; without this, every
  // update recreates the value object and re-renders all 5 frames
  // regardless of which single widget actually changed.
  // Must be called before the null early return below (rules of
  // hooks); the type assertion is safe because the value is only
  // rendered into the Provider after the early return has confirmed
  // layout and spec are non-null.
  const value = useMemo(
    () => ({ layout, spec, isEditing, enterEditMode, exitEditMode, moveWidget, resizeWidget, resetLayout }),
    [layout, spec, isEditing, enterEditMode, exitEditMode, moveWidget, resizeWidget, resetLayout]
  ) as WidgetLayoutContextValue;

  if (!layout || !spec) return null;

  return (
    <WidgetLayoutContext.Provider value={value}>
      {children}
    </WidgetLayoutContext.Provider>
  );
}

export function useWidgetLayout() {
  const ctx = useContext(WidgetLayoutContext);
  if (!ctx) throw new Error("useWidgetLayout must be used within WidgetLayoutProvider");
  return ctx;
}
