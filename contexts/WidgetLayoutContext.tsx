// contexts/WidgetLayoutContext.tsx
"use client";

import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
    window.localStorage.removeItem(GRID_LAYOUTS_KEY);
  } catch {
    // Same as above — nothing to recover from if storage is blocked.
  }
}

/* Per-lattice layout memory — the monitor-switch fix. A laptop
   screen and an external monitor produce different lattices; the
   old behavior refit (squeezed) the one stored layout on every
   switch, and the first drag afterwards PERSISTED the squeeze,
   permanently destroying the big-screen arrangement. Instead, each
   lattice signature ("colsxrows") remembers its own arrangement:
   switching monitors restores that screen's layout untouched, and a
   lattice seen for the first time gets one deterministic refit that
   is then remembered for it alone. */
// "grids2", not "grids": the first-generation map was populated by the
// index-preserving refit (see refitLayout) — lattices first visited
// via a small window remembered the SQUEEZED arrangement forever.
// Bumping the key drops those poisoned memories once; arrangements
// re-seed through the proportional refit / defaults from here on.
const GRID_LAYOUTS_KEY = `${STORAGE_KEY}:grids2`;

function gridSignature(spec: GridSpec): string {
  return `${spec.cols}x${spec.rows}`;
}

function readGridMap(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(GRID_LAYOUTS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeGridMap(map: Record<string, string>) {
  try {
    window.localStorage.setItem(GRID_LAYOUTS_KEY, JSON.stringify(map));
  } catch {
    // Storage unavailable — same fallback story as above.
  }
}

function currentSpec(): GridSpec {
  return computeGridSpec(window.innerWidth, window.innerHeight, TOP_BOUND, BOTTOM_RESERVE);
}

// Re-fit an existing layout onto a (possibly different) lattice —
// used on window resize. Order is WIDGET_IDS order, same as
// parseStoredLayout, so refits are deterministic.
//
// PROPORTIONAL, not index-preserving: cells are remapped by their
// fraction of the old lattice's placeable range before clamping.
// The old index-preserving version only fixed violations — a widget
// at col 11 of 13 (right edge) squeezed to col 6 of 8 on a laptop,
// but growing back to 13 columns it stayed at col 6, because col 6
// "fits" a 13-column lattice perfectly and nothing was violated.
// The squeezed arrangement then got REMEMBERED for the big lattice
// (the reported "widgets stick to the small-window layout" bug).
// Proportional remap keeps position MEANING: 11/11 → 6/6 → 11/11 —
// edge-anchored stays edge-anchored through any resize round trip.
function refitLayout(layout: WidgetLayout, spec: GridSpec, prevSpec?: GridSpec | null): WidgetLayout {
  const next = {} as WidgetLayout;
  const occupied: Occupancy[] = [];
  let changed = false;
  // Reading order (top-left first), not registry order: widgets that
  // were visually first claim their cells first, so a squeeze keeps
  // the arrangement's shape instead of scattering by declaration
  // order.
  const orderedIds = [...WIDGET_IDS].sort(
    (a, b) => layout[a].row - layout[b].row || layout[a].col - layout[b].col,
  );
  for (const id of orderedIds) {
    const entry = layout[id];
    const span = spanForSize(entry.size);
    let desired: Cell = entry;
    if (prevSpec && (prevSpec.cols !== spec.cols || prevSpec.rows !== spec.rows)) {
      const oldMaxCol = Math.max(0, prevSpec.cols - span.cols);
      const oldMaxRow = Math.max(0, prevSpec.rows - span.rows);
      const newMaxCol = Math.max(0, spec.cols - span.cols);
      const newMaxRow = Math.max(0, spec.rows - span.rows);
      desired = {
        col: oldMaxCol === 0 ? 0 : Math.round((entry.col / oldMaxCol) * newMaxCol),
        row: oldMaxRow === 0 ? 0 : Math.round((entry.row / oldMaxRow) * newMaxRow),
      };
    }
    const cell = resolveCellCollision(spec, clampCell(spec, desired, span), span, occupied);
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
  // The lattice the CURRENT layout state was fitted against — what the
  // proportional refit rescales FROM on the next lattice change. A ref
  // (not the spec state) so the resize effect's []-dep closure always
  // reads the latest value.
  const fittedSpecRef = useRef<GridSpec | null>(null);

  // Load once on mount — SSR-safe "null until mounted" convention.
  // This lattice's own remembered layout wins; the legacy single
  // stored layout is the fallback for pre-per-grid visitors.
  useEffect(() => {
    const mountSpec = currentSpec();
    const defaults = computeDefaultLayout(mountSpec);
    setSpec(mountSpec);
    fittedSpecRef.current = mountSpec;
    const remembered = readGridMap()[gridSignature(mountSpec)] ?? readStoredLayoutRaw();
    setLayout(parseStoredLayout(remembered, defaults, mountSpec));
  }, []);

  // Window resize recomputes the lattice. DEBOUNCED: dragging the
  // browser between monitors fires a storm of intermediate sizes —
  // reacting to each one would refit against lattices the user never
  // sees (and remember those junk fits). Only the settled size
  // counts. A lattice we've seen before restores its own remembered
  // arrangement; a brand-new one gets a single refit, remembered for
  // it from then on.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let verify: ReturnType<typeof setTimeout> | undefined;

    const applyCurrent = (): GridSpec => {
      const nextSpec = currentSpec();
      const fromSpec = fittedSpecRef.current;
      setSpec(nextSpec);
      fittedSpecRef.current = nextSpec;
      setLayout((prev) => {
        if (!prev) return prev;
        const sig = gridSignature(nextSpec);
        const remembered = readGridMap()[sig];
        if (remembered) {
          return parseStoredLayout(remembered, computeDefaultLayout(nextSpec), nextSpec);
        }
        // First time on this lattice: rescale the current arrangement
        // proportionally FROM the lattice it was fitted against, so
        // edge-anchored widgets stay edge-anchored (see refitLayout).
        const refit = refitLayout(prev, nextSpec, fromSpec);
        const map = readGridMap();
        map[sig] = serializeLayout(refit);
        writeGridMap(map);
        return refit;
      });
      return nextSpec;
    };

    // Applies the current viewport's lattice, then VERIFIES it a beat
    // later: fullscreen enter/exit animates the window, and the last
    // resize event can fire while the dimensions are still
    // mid-transition — the debounce then measures a size the window
    // never actually settles at, applies a lattice for it, and no
    // further resize event ever arrives to correct it (widgets
    // stranded out of bounds; the reported fullscreen bug). The
    // follow-up check re-measures after the transition has definitely
    // finished and re-applies only if the lattice it applied no
    // longer matches reality — zero cost in the common case.
    const settle = () => {
      const applied = applyCurrent();
      if (verify) clearTimeout(verify);
      verify = setTimeout(() => {
        if (gridSignature(currentSpec()) !== gridSignature(applied)) settle();
      }, 300);
    };

    const handleResize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(settle, 150);
    };
    window.addEventListener("resize", handleResize);
    // Fullscreen toggles are the known producer of resize storms whose
    // final event lies about the settled size — listen to the toggle
    // itself as an extra trigger into the same settle path.
    document.addEventListener("fullscreenchange", handleResize);
    return () => {
      if (timer) clearTimeout(timer);
      if (verify) clearTimeout(verify);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("fullscreenchange", handleResize);
    };
  }, []);

  // Persist to both stores: the legacy key (mount fallback) and this
  // lattice's own slot — a drag on the laptop can no longer clobber
  // the external monitor's arrangement.
  const persist = useCallback(
    (next: WidgetLayout) => {
      writeStoredLayoutRaw(serializeLayout(next));
      if (spec) {
        const map = readGridMap();
        map[gridSignature(spec)] = serializeLayout(next);
        writeGridMap(map);
      }
    },
    [spec],
  );

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
    fittedSpecRef.current = nextSpec;
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
