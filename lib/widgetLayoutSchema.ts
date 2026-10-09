import type { WidgetId, WidgetSize } from "./widgetSizeTiers.ts";
import {
  cellsOverlap,
  clampCell,
  resolveCellCollision,
  spanForSize,
  type Cell,
  type GridSpec,
  type Occupancy,
} from "./widgetPositioning.ts";
import { MASCOT_OCCUPANCY } from "./mascotSlot.ts";

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

export const WIDGET_IDS: WidgetId[] = ["aiTools", "location", "motivation", "leetcode", "codeforces", "claude"];

// Lattice cells no widget may ever occupy — currently just the
// mascot's permanent home at the top-left cell (see lib/mascotSlot.ts;
// the mascot frame renders OUTSIDE the widget system). Every
// collision-resolution path seeds its `occupied` list with this, so
// defaults, stored layouts, resize refits, drags, resizes and the
// drag-preview outline all route around the cell.
export const RESERVED_OCCUPANCY: readonly Occupancy[] = [MASCOT_OCCUPANCY];

// Versioned — a schema change bumps this suffix and simply falls
// back to defaults for old keys, no migration needed. v4 → v5: the
// clock widget was removed and replaced by the location widget.
// v5 → v6: the music player (large "nowPlaying" widget) was removed;
// v5 arrangements were built around its 2×2 footprint and would keep
// a hole where it sat, so everyone re-seeds from the new defaults.
// The photo widget's removal (its top-left cell became the mascot's
// reserved home) deliberately did NOT bump this: the stale "photo"
// entry is dropped like any unknown id, and parseStoredLayout
// resolves every surviving entry around RESERVED_OCCUPANCY, so a v6
// layout with a widget parked on (0,0) self-heals on load instead of
// throwing away the visitor's arrangement.
// v6 → v7: the symmetric two-column default (Codeforces moved off the
// centre, where it covered the wallpaper's subject; Claude added).
export const STORAGE_KEY = "portfolio-widget-layout-v7";

// Default layout in cells — the owner's curated arrangement (made
// default for every visitor per request): the top-left cell is the
// mascot's reserved home (not a widget — see RESERVED_OCCUPANCY); a
// right-side column stack of GitHub heatmap (medium) over
// location + motivation (two smalls side by side), with the LeetCode
// under the stack on row 2; and a matching left column under the
// mascot: Claude, then Codeforces (both medium). Two symmetric columns
// leave the middle of the desktop EMPTY, because the wallpapers are
// chosen with their subject dead centre — the widgets frame it, never
// cover it.
// Every placement runs through resolveCellCollision in sequence, so
// the result is collision-free by construction even on narrow
// lattices where the naive spots would collide.
//
// A typical laptop viewport (768-900px tall minus MenuBar/Dock
// reserves) has 3 rows, a 27" monitor 5-6. On a short 2-row lattice
// (~720px tall) row 2 is clamped onto the occupied row 1, and the
// resolver slides LeetCode left beside the smalls and Codeforces
// above it — a compact 4×2 block on the right, still collision-free
// (needs cols ≥ 5: 9 cells beside the mascot's 1).
export function computeDefaultLayout(spec: GridSpec): WidgetLayout {
  const rightCol = Math.max(0, spec.cols - 2);
  const placements: [WidgetId, WidgetSize, Cell][] = [
    ["aiTools", "medium", { col: rightCol, row: 0 }],
    ["location", "small", { col: rightCol, row: 1 }],
    ["motivation", "small", { col: rightCol + 1, row: 1 }],
    ["leetcode", "medium", { col: rightCol, row: 2 }],
    // Codeforces is placed before Claude: on a lattice too small for
    // both at medium, Claude is the one that steps down (its small size
    // still shows the headline number).
    ["codeforces", "medium", { col: 0, row: 2 }],
    ["claude", "medium", { col: 0, row: 1 }],
  ];

  const layout = {} as WidgetLayout;
  const occupied: Occupancy[] = [...RESERVED_OCCUPANCY];
  for (const [id, preferred, desired] of placements) {
    // A large default steps down (large → medium → small) when the
    // lattice is too small to hold it without landing on the mascot's
    // cell or another widget; smaller defaults are placed as before.
    const sizes = VALID_SIZES.slice(0, VALID_SIZES.indexOf(preferred) + 1).reverse();
    let placed: { size: WidgetSize; cell: Cell } | null = null;
    for (const size of sizes) {
      const span = spanForSize(size);
      const cell = resolveCellCollision(spec, desired, span, occupied);
      const free = !occupied.some((o) => cellsOverlap(cell, span, o.cell, o.span));
      if (free || size === "small") {
        placed = { size, cell };
        if (free) break;
      }
    }
    const { size, cell } = placed!;
    layout[id] = { col: cell.col, row: cell.row, size };
    occupied.push({ cell, span: spanForSize(size) });
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
// WidgetLayout. Only ids in WIDGET_IDS are read — entries for widgets
// that no longer exist (e.g. "nowPlaying" from before the music
// player was removed) are silently dropped, never a rejection of the
// whole layout. Any missing or malformed per-widget entry falls back
// to that widget's own default individually; every entry is clamped
// to the lattice and collision-resolved (a layout saved on a wider
// window may not fit the current column count) — including against
// RESERVED_OCCUPANCY, so an entry saved on the mascot's cell (from
// before the photo widget was removed) is moved to the nearest free
// cell.
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
  const occupied: Occupancy[] = [...RESERVED_OCCUPANCY];
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
