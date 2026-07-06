import type { WidgetId, WidgetSize } from "./widgetSizeTiers.ts";
import {
  clampCell,
  resolveCellCollision,
  spanForSize,
  type Cell,
  type GridSpec,
  type Occupancy,
} from "./widgetPositioning.ts";

export type { WidgetId, WidgetSize };

// Positions are CELLS on the desktop lattice, not pixels — the macOS
// model. Pixel rects are derived per-viewport from the GridSpec, so a
// saved layout stays symmetric and on-grid on any window size instead
// of drifting off-screen.
export interface WidgetLayoutEntry {
  col: number;
  row: number;
  size: WidgetSize;
}

export type WidgetLayout = Record<WidgetId, WidgetLayoutEntry>;

export const WIDGET_IDS: WidgetId[] = ["photo", "nowPlaying", "aiTools", "location", "motivation"];

// Versioned — a schema change bumps this suffix and simply falls
// back to defaults for old keys, no migration needed. v4 → v5: the
// clock widget was removed and replaced by the location widget.
export const STORAGE_KEY = "portfolio-widget-layout-v5";

// Default layout in cells — the owner's curated arrangement (made
// default for every visitor per request): photo small at top-left;
// a right-side column stack of GitHub heatmap (medium) over
// location + motivation (two smalls side by side) over the music
// player (large). Every placement runs through resolveCellCollision
// in sequence, so the result is collision-free by construction even
// on narrow lattices where the naive spots would collide.
export function computeDefaultLayout(spec: GridSpec): WidgetLayout {
  const placements: [WidgetId, WidgetSize, Cell][] = [
    ["photo", "small", { col: 0, row: 0 }],
    ["aiTools", "medium", { col: spec.cols - 2, row: 0 }],
    ["location", "small", { col: spec.cols - 2, row: 1 }],
    ["motivation", "small", { col: spec.cols - 1, row: 1 }],
    ["nowPlaying", "large", { col: spec.cols - 2, row: 2 }],
  ];

  const layout = {} as WidgetLayout;
  const occupied: Occupancy[] = [];
  for (const [id, size, desired] of placements) {
    const span = spanForSize(size);
    const cell = resolveCellCollision(spec, desired, span, occupied);
    layout[id] = { col: cell.col, row: cell.row, size };
    occupied.push({ cell, span });
  }
  return layout;
}

const VALID_SIZES: WidgetSize[] = ["small", "medium", "large"];

function isValidEntry(value: unknown): value is WidgetLayoutEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.col === "number" &&
    Number.isInteger(entry.col) &&
    entry.col >= 0 &&
    typeof entry.row === "number" &&
    Number.isInteger(entry.row) &&
    entry.row >= 0 &&
    typeof entry.size === "string" &&
    VALID_SIZES.includes(entry.size as WidgetSize)
  );
}

// Pure — takes the raw localStorage string (or null), the defaults,
// and the current lattice spec; returns a fully valid, non-overlapping
// WidgetLayout. Any missing or malformed per-widget entry falls back
// to that widget's own default individually; every entry is clamped
// to the lattice and collision-resolved (a layout saved on a wider
// window may not fit the current column count).
export function parseStoredLayout(raw: string | null, defaults: WidgetLayout, spec: GridSpec): WidgetLayout {
  let candidate: Record<string, unknown> = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) candidate = parsed as Record<string, unknown>;
    } catch {
      // fall through to defaults
    }
  }

  const layout = {} as WidgetLayout;
  const occupied: Occupancy[] = [];
  for (const id of WIDGET_IDS) {
    const value = candidate[id];
    const entry = isValidEntry(value) ? value : defaults[id];
    const span = spanForSize(entry.size);
    const cell = resolveCellCollision(spec, clampCell(spec, entry, span), span, occupied);
    layout[id] = { col: cell.col, row: cell.row, size: entry.size };
    occupied.push({ cell, span });
  }
  return layout;
}

export function serializeLayout(layout: WidgetLayout): string {
  return JSON.stringify(layout);
}
