// contexts/WidgetLayoutContext.tsx
"use client";

import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from "react";
import { useShellMetrics } from "@/lib/useShellMetrics";
import { clampToBounds, type Bounds } from "@/lib/widgetPositioning";
import { TOP_BOUND, BOTTOM_RESERVE } from "@/contexts/WindowManagerContext";
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
import { getSizeDimensions } from "@/lib/widgetSizeTiers";

interface WidgetLayoutContextValue {
  layout: WidgetLayout;
  isEditing: boolean;
  enterEditMode: () => void;
  exitEditMode: () => void;
  updatePosition: (id: WidgetId, x: number, y: number) => void;
  updateSize: (id: WidgetId, size: WidgetSize) => void;
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

function boundsFor(id: WidgetId, size: WidgetSize, viewportWidth: number, viewportHeight: number): Bounds {
  const dims = getSizeDimensions(id, size);
  const height = dims.height ?? 0; // content-driven tiers clamp Y loosely; width is the hard constraint
  return {
    minX: 0,
    maxX: Math.max(0, viewportWidth - dims.width),
    minY: TOP_BOUND,
    maxY: Math.max(TOP_BOUND, viewportHeight - BOTTOM_RESERVE - height),
  };
}

export function WidgetLayoutProvider({ children }: { children: ReactNode }) {
  const metrics = useShellMetrics();
  const [layout, setLayout] = useState<WidgetLayout | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Load once on mount — matches the SSR-safe "null until mounted"
  // convention already used by useLiveClock (ClockWidget.tsx).
  useEffect(() => {
    const defaults = computeDefaultLayout({
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      inset: metrics.inset,
    });
    const raw = readStoredLayoutRaw();
    const parsed = parseStoredLayout(raw, defaults);
    // Clamp every loaded entry into the current viewport — a layout
    // saved on a wider window (or a different device) never renders
    // off-screen after a resize.
    const clamped = {} as WidgetLayout;
    for (const id of WIDGET_IDS) {
      const entry = parsed[id];
      const bounds = boundsFor(id, entry.size, window.innerWidth, window.innerHeight);
      const { x, y } = clampToBounds(entry.x, entry.y, bounds);
      clamped[id] = { x, y, size: entry.size };
    }
    setLayout(clamped);
    // Runs once on mount only — metrics.inset at mount time is enough
    // to seed defaults; a live-resize re-clamp is a acceptable, not a
    // per-render dependency (re-running this on every metrics change
    // would fight the visitor's own in-progress drag).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Safety net on window resize, same pattern as
  // WindowManagerContext's own resize handler — shrinking the browser
  // can leave a saved widget position off the new, smaller viewport.
  useEffect(() => {
    const handleResize = () => {
      setLayout((prev) => {
        if (!prev) return prev;
        const next = {} as WidgetLayout;
        let changed = false;
        for (const id of WIDGET_IDS) {
          const entry = prev[id];
          const bounds = boundsFor(id, entry.size, window.innerWidth, window.innerHeight);
          const { x, y } = clampToBounds(entry.x, entry.y, bounds);
          next[id] = x === entry.x && y === entry.y ? entry : { ...entry, x, y };
          if (next[id] !== entry) changed = true;
        }
        return changed ? next : prev;
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const persist = useCallback((next: WidgetLayout) => {
    writeStoredLayoutRaw(serializeLayout(next));
  }, []);

  const enterEditMode = useCallback(() => setIsEditing(true), []);
  const exitEditMode = useCallback(() => setIsEditing(false), []);

  const updatePosition = useCallback((id: WidgetId, x: number, y: number) => {
    setLayout((prev) => {
      if (!prev) return prev;
      const bounds = boundsFor(id, prev[id].size, window.innerWidth, window.innerHeight);
      const clamped = clampToBounds(x, y, bounds);
      const next = { ...prev, [id]: { ...prev[id], ...clamped } };
      persist(next);
      return next;
    });
  }, [persist]);

  const updateSize = useCallback((id: WidgetId, size: WidgetSize) => {
    setLayout((prev) => {
      if (!prev) return prev;
      const bounds = boundsFor(id, size, window.innerWidth, window.innerHeight);
      const clamped = clampToBounds(prev[id].x, prev[id].y, bounds);
      const next = { ...prev, [id]: { ...clamped, size } };
      persist(next);
      return next;
    });
  }, [persist]);

  const resetLayout = useCallback(() => {
    clearStoredLayoutRaw();
    const defaults = computeDefaultLayout({
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      inset: metrics.inset,
    });
    setLayout(defaults);
  }, [metrics.inset]);

  if (!layout) return null;

  return (
    <WidgetLayoutContext.Provider
      value={{ layout, isEditing, enterEditMode, exitEditMode, updatePosition, updateSize, resetLayout }}
    >
      {children}
    </WidgetLayoutContext.Provider>
  );
}

export function useWidgetLayout() {
  const ctx = useContext(WidgetLayoutContext);
  if (!ctx) throw new Error("useWidgetLayout must be used within WidgetLayoutProvider");
  return ctx;
}
