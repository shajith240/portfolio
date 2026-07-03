# Widget Edit Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a visitor long-press any desktop widget to enter a real-macOS-style jiggle "edit mode," freely drag widgets anywhere on the desktop with grid-snap + alignment guides, resize each via a corner drag-handle across Small/Medium/Large tiers, with the result persisted per-browser (localStorage, no login) so it only ever affects that one visitor.

**Architecture:** A new `WidgetLayoutContext` (mirrors the existing `WindowManagerContext` pattern) owns each widget's `{x, y, size}` and replaces the two fixed flex-column stacks (`DesktopWidgetStack`, `RightWidgetStack`) with one absolute-position `WidgetCanvas`. A `WidgetFrame` wrapper (new) supplies the interaction chrome (jiggle, drag, resize handle) around each widget's own visual content, which is untouched except for accepting a new `size` prop and branching its render per tier.

**Tech Stack:** Next.js/React/TypeScript/Framer Motion (all already in use) — no new dependencies. Pure logic modules are unit-tested with plain Node (v24+ runs `.ts` files directly via type-stripping — confirmed working, no `ts-node`/`tsx`/test-framework dependency needed).

## Global Constraints

- No new npm dependencies (per this project's existing stack — Framer Motion covers all animation needs).
- No test framework exists in this repo and none should be added — pure-logic modules get real Node-executed assertion scripts (`node lib/foo.test.ts`); React/DOM behavior is verified via `npx tsc --noEmit` + `npm run build` + a manual checklist, matching this project's established verification convention all session.
- Reuse existing constants, don't duplicate: `WIDGET_UNIT`/`WIDGET_GAP`/`WIDGET_PADDING`/`WIDGET_RADIUS` from `lib/widgetGrid.ts`, `TOP_BOUND`/`BOTTOM_RESERVE` from `contexts/WindowManagerContext.tsx`, spring presets from `docs/design-system/motion.md`.
- Every new Framer Motion transition must come from the existing preset vocabulary in `docs/design-system/motion.md`, plus exactly one new preset this plan adds (`widgetSnap`) — do not invent ad hoc stiffness/damping values.
- `prefers-reduced-motion` must disable jiggle oscillation and both drag/resize springs entirely (site-wide rule already established in `app/globals.css` for CSS transitions; this plan must extend it to Framer Motion's JS-driven springs via `useReducedMotion()`, which CSS-only rules don't reach).
- Commit after each task with `tsc --noEmit` and `npm run build` passing.

---

## File structure

| File | Responsibility |
|---|---|
| `lib/widgetSizeTiers.ts` | Pure: per-widget per-tier pixel dimensions, `nearestSizeTier()` matching. |
| `lib/widgetPositioning.ts` | Pure: grid-snap, bounds-clamp, cross-widget alignment-guide detection. |
| `lib/widgetLayoutSchema.ts` | Pure: types, `computeDefaultLayout()`, `parseStoredLayout()`, `serializeLayout()`. |
| `lib/useLongPress.ts` | Reusable hook: long-press detection + click-suppression. |
| `contexts/WidgetLayoutContext.tsx` | React glue: localStorage read/write, exposes layout state + mutators. |
| `components/widgets/WidgetFrame.tsx` | Interaction chrome: jiggle, drag-to-reposition, resize handle. Wraps widget content. |
| `components/widgets/WidgetCanvas.tsx` | Renders all 5 widgets via `WidgetFrame`, replaces the two stacks. |
| `components/widgets/PhotoWidget.tsx` | Modified: accepts `size` prop, 3 tiers. |
| `components/widgets/NowPlayingWidget.tsx` | Modified: accepts `size` prop, 3 tiers. |
| `components/widgets/AIToolsWidget.tsx` | Modified: accepts `size` prop, 3 tiers. |
| `components/widgets/ClockWidget.tsx` | Modified: accepts `size` prop, 3 tiers. |
| `components/widgets/MotivationWidget.tsx` | Modified: accepts `size` prop, 2 tiers. |
| `components/layout/AppShell.tsx` | Modified: mount `WidgetLayoutProvider`, swap in `WidgetCanvas`, remove old stacks. |

---

### Task 1: Widget size-tier dimension table

**Files:**
- Create: `lib/widgetSizeTiers.ts`
- Test: `lib/widgetSizeTiers.test.ts`

**Interfaces:**
- Produces: `WidgetSize` (`"small"|"medium"|"large"`), `WidgetId` (`"photo"|"nowPlaying"|"aiTools"|"clock"|"motivation"`), `SizeDimensions { width: number; height?: number }` (height omitted = content-driven/`height:auto`), `WIDGET_SIZE_TIERS: Record<WidgetId, Partial<Record<WidgetSize, SizeDimensions>>>`, `getSizeDimensions(id, size): SizeDimensions`, `nearestSizeTier(tiers, liveWidth, liveHeight): WidgetSize`, `supportedSizes(id): WidgetSize[]`.

Concrete tier dimensions, computed the same way the AIToolsWidget/ClockWidget height fix was computed earlier this session (exact content math, not eyeballed):

- `photo`: small 155×155, medium 260×260 (unchanged), large 338×338 — all forced-square.
- `nowPlaying`: small 155×155 (art + play/pause only), medium 260×auto (today's layout minus `LyricsPanel`), large 260×auto (today's complete layout, unchanged — this tier is exactly what ships today).
- `aiTools`: small 155×155 (2×2 grid, 4 tools, 53px icons — computed: 16px padding ×2 + 2 rows×53 + 1 gap×16 = 154, rounds to 155 with `alignItems:center` absorbing the 1px slack, the same pattern already used in the existing medium tier), medium 260×176 (today's 3×2/6-icon layout, unchanged), large 260×256 (3×3 grid, 9-tool capacity, same 64px icons as medium — computed: 32 padding + 3 rows×64 + 2 gaps×16 = 256).
- `clock`: small 155×auto (time only, no day/date), medium 260×176 (today's layout, unchanged), large 260×auto (today's layout with larger type/more breathing room).
- `motivation`: medium 210×247, large 260×305 (both computed from `MOTIVATION_IMAGE`'s real 736×864 aspect ratio: `round(width × 864/736)`) — no small tier.

- [ ] **Step 1: Write the failing test**

```ts
// lib/widgetSizeTiers.test.ts
import assert from "node:assert/strict";
import { WIDGET_SIZE_TIERS, getSizeDimensions, nearestSizeTier, supportedSizes } from "./widgetSizeTiers.ts";

// getSizeDimensions
assert.deepEqual(getSizeDimensions("photo", "medium"), { width: 260, height: 260 });
assert.deepEqual(getSizeDimensions("aiTools", "large"), { width: 260, height: 256 });

// supportedSizes — motivation has no "small" tier
assert.deepEqual(supportedSizes("motivation"), ["medium", "large"]);
assert.deepEqual(supportedSizes("photo"), ["small", "medium", "large"]);

// nearestSizeTier — synthetic tiers, decoupled from real widget data
const tiers = { small: { width: 100, height: 100 }, medium: { width: 200, height: 200 }, large: { width: 300, height: 300 } };
assert.equal(nearestSizeTier(tiers, 120, 110), "small");
assert.equal(nearestSizeTier(tiers, 210, 195), "medium");
assert.equal(nearestSizeTier(tiers, 500, 500), "large"); // clamps to nearest even far outside range

// nearestSizeTier — width-only tier (height omitted = don't compare on it)
const widthOnlyTiers = { small: { width: 100 }, large: { width: 300 } };
assert.equal(nearestSizeTier(widthOnlyTiers, 90, 9999), "small"); // huge height ignored, width decides

console.log("widgetSizeTiers: all assertions passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node lib/widgetSizeTiers.test.ts`
Expected: FAIL — `Cannot find module './widgetSizeTiers.ts'` (file doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/widgetSizeTiers.ts
//
// Relative import, not the "@/" alias — this module's own test
// (Step 1 above) runs via plain `node lib/widgetSizeTiers.test.ts`,
// and Node's ESM resolver has no knowledge of the "@/*" -> "./*"
// tsconfig path alias (that's a TypeScript-compiler/bundler-only
// convention). A relative import resolves identically under plain
// Node, tsc, and Next's own bundler, so it's the only form that works
// everywhere this file is loaded.
import { MOTIVATION_IMAGE } from "../data/motivation";

export type WidgetSize = "small" | "medium" | "large";
export type WidgetId = "photo" | "nowPlaying" | "aiTools" | "clock" | "motivation";

export interface SizeDimensions {
  width: number;
  // Omitted = content-driven (render height: "auto"); nearestSizeTier
  // then matches on width alone for that tier.
  height?: number;
}

const motivationMediumHeight = Math.round(210 * (MOTIVATION_IMAGE.height / MOTIVATION_IMAGE.width));
const motivationLargeHeight = Math.round(260 * (MOTIVATION_IMAGE.height / MOTIVATION_IMAGE.width));

// Real, computed dimensions — see the task's design notes for the
// exact math behind each fixed-height value. Widgets whose tier omits
// `height` render at their natural content height for that tier
// (verified deterministic per-widget in Tasks 7-11: fixed-line text
// with ellipsis truncation never changes height regardless of content
// length).
export const WIDGET_SIZE_TIERS: Record<WidgetId, Partial<Record<WidgetSize, SizeDimensions>>> = {
  photo: {
    small: { width: 155, height: 155 },
    medium: { width: 260, height: 260 },
    large: { width: 338, height: 338 },
  },
  nowPlaying: {
    small: { width: 155, height: 155 },
    medium: { width: 260 },
    large: { width: 260 },
  },
  aiTools: {
    small: { width: 155, height: 155 },
    medium: { width: 260, height: 176 },
    large: { width: 260, height: 256 },
  },
  clock: {
    small: { width: 155 },
    medium: { width: 260, height: 176 },
    large: { width: 260 },
  },
  motivation: {
    medium: { width: 210, height: motivationMediumHeight },
    large: { width: 260, height: motivationLargeHeight },
  },
};

export function supportedSizes(id: WidgetId): WidgetSize[] {
  return Object.keys(WIDGET_SIZE_TIERS[id]) as WidgetSize[];
}

export function getSizeDimensions(id: WidgetId, size: WidgetSize): SizeDimensions {
  const tiers = WIDGET_SIZE_TIERS[id];
  return tiers[size] ?? tiers[supportedSizes(id)[0]]!;
}

// Given a widget's own tier table and a live width/height (e.g. mid
// resize-drag), finds the tier whose defined dimensions are
// numerically closest. A tier with no `height` (content-driven) is
// compared on width alone.
export function nearestSizeTier(
  tiers: Partial<Record<WidgetSize, SizeDimensions>>,
  liveWidth: number,
  liveHeight: number
): WidgetSize {
  const entries = Object.entries(tiers) as [WidgetSize, SizeDimensions][];
  let best = entries[0][0];
  let bestDist = Infinity;
  for (const [size, dims] of entries) {
    const dist =
      dims.height === undefined
        ? Math.abs(dims.width - liveWidth)
        : Math.hypot(dims.width - liveWidth, dims.height - liveHeight);
    if (dist < bestDist) {
      bestDist = dist;
      best = size;
    }
  }
  return best;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node lib/widgetSizeTiers.test.ts`
Expected: `widgetSizeTiers: all assertions passed`

- [ ] **Step 5: Verify the rest of the project still compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/widgetSizeTiers.ts lib/widgetSizeTiers.test.ts
git commit -m "feat: add widget size-tier dimension table"
```

---

### Task 2: Positioning math (grid-snap, clamp, alignment guides)

**Files:**
- Create: `lib/widgetPositioning.ts`
- Test: `lib/widgetPositioning.test.ts`

**Interfaces:**
- Produces: `GRID_SIZE`, `GUIDE_THRESHOLD`, `Rect { x, y, width, height }`, `Bounds { minX, maxX, minY, maxY }`, `AlignmentGuide { axis: "x"|"y"; position: number }`, `snapToGrid(value): number`, `clampToBounds(x, y, bounds): {x, y}`, `computeAlignmentSnap(dragged: Rect, others: Rect[]): { x: number; y: number; guides: AlignmentGuide[] }`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/widgetPositioning.test.ts
import assert from "node:assert/strict";
import { snapToGrid, clampToBounds, computeAlignmentSnap, GUIDE_THRESHOLD } from "./widgetPositioning.ts";

// snapToGrid — 8px increments
assert.equal(snapToGrid(13), 16);
assert.equal(snapToGrid(11), 8);
assert.equal(snapToGrid(0), 0);

// clampToBounds
const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 200 };
assert.deepEqual(clampToBounds(-10, 50, bounds), { x: 0, y: 50 });
assert.deepEqual(clampToBounds(150, 250, bounds), { x: 100, y: 200 });
assert.deepEqual(clampToBounds(50, 50, bounds), { x: 50, y: 50 });

// computeAlignmentSnap — left edges align within threshold
const dragged = { x: 103, y: 300, width: 260, height: 176 };
const others = [{ x: 100, y: 0, width: 260, height: 260 }];
const result = computeAlignmentSnap(dragged, others);
assert.equal(result.x, 100); // snapped to other's left edge
assert.equal(result.guides.length, 1);
assert.equal(result.guides[0].axis, "x");
assert.equal(result.guides[0].position, 100);

// computeAlignmentSnap — nothing within threshold, no snap/no guides
const farDragged = { x: 500, y: 500, width: 260, height: 176 };
const farResult = computeAlignmentSnap(farDragged, others);
assert.equal(farResult.x, 500);
assert.equal(farResult.guides.length, 0);

// computeAlignmentSnap — center-to-center alignment
const centerDragged = { x: 100 + GUIDE_THRESHOLD - 1, y: 400, width: 260, height: 176 };
const centerOthers = [{ x: 100, y: 0, width: 260, height: 260 }]; // center x = 230
const centerResult = computeAlignmentSnap(centerDragged, centerOthers);
assert.equal(centerResult.x + 260 / 2, 230); // dragged's own center now equals other's center

console.log("widgetPositioning: all assertions passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node lib/widgetPositioning.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/widgetPositioning.ts

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface AlignmentGuide {
  axis: "x" | "y";
  position: number;
}

// Matches this codebase's own documented 8pt spacing scale
// (docs/design-system/layout.md) — every drag lands on this grid.
export const GRID_SIZE = 8;

// Distance (px) within which a dragged edge/center snaps to another
// widget's matching edge/center and renders a guide line — matches
// real macOS's own smart-alignment-guide feel.
export const GUIDE_THRESHOLD = 6;

export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export function clampToBounds(x: number, y: number, bounds: Bounds): { x: number; y: number } {
  return {
    x: Math.min(Math.max(x, bounds.minX), bounds.maxX),
    y: Math.min(Math.max(y, bounds.minY), bounds.maxY),
  };
}

function edgesX(r: Rect): number[] {
  return [r.x, r.x + r.width / 2, r.x + r.width];
}

function edgesY(r: Rect): number[] {
  return [r.y, r.y + r.height / 2, r.y + r.height];
}

// Compares the dragged rect's left/center/right (and top/center/
// bottom) against every other rect's same three lines. Whichever
// pair is closest — and under GUIDE_THRESHOLD — wins per axis; the
// dragged rect's position shifts by exactly the distance needed to
// align that pair, and a guide is reported at the aligned coordinate.
export function computeAlignmentSnap(
  dragged: Rect,
  others: Rect[]
): { x: number; y: number; guides: AlignmentGuide[] } {
  let snappedX = dragged.x;
  let bestXDist = GUIDE_THRESHOLD;
  let guideX: number | null = null;

  let snappedY = dragged.y;
  let bestYDist = GUIDE_THRESHOLD;
  let guideY: number | null = null;

  for (const other of others) {
    for (const dEdge of edgesX(dragged)) {
      for (const oEdge of edgesX(other)) {
        const dist = Math.abs(dEdge - oEdge);
        if (dist < bestXDist) {
          bestXDist = dist;
          snappedX = dragged.x + (oEdge - dEdge);
          guideX = oEdge;
        }
      }
    }
    for (const dEdge of edgesY(dragged)) {
      for (const oEdge of edgesY(other)) {
        const dist = Math.abs(dEdge - oEdge);
        if (dist < bestYDist) {
          bestYDist = dist;
          snappedY = dragged.y + (oEdge - dEdge);
          guideY = oEdge;
        }
      }
    }
  }

  const guides: AlignmentGuide[] = [];
  if (guideX !== null) guides.push({ axis: "x", position: guideX });
  if (guideY !== null) guides.push({ axis: "y", position: guideY });

  return { x: snappedX, y: snappedY, guides };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node lib/widgetPositioning.test.ts`
Expected: `widgetPositioning: all assertions passed`

- [ ] **Step 5: Verify the rest of the project still compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/widgetPositioning.ts lib/widgetPositioning.test.ts
git commit -m "feat: add widget drag positioning math (grid-snap, clamp, alignment guides)"
```

---

### Task 3: Layout schema — defaults, parse, serialize

**Files:**
- Create: `lib/widgetLayoutSchema.ts`
- Test: `lib/widgetLayoutSchema.test.ts`

**Interfaces:**
- Consumes: `WidgetId`, `WidgetSize`, `getSizeDimensions` from `lib/widgetSizeTiers.ts` (Task 1).
- Produces: `WidgetLayoutEntry { x, y, size }`, `WidgetLayout = Record<WidgetId, WidgetLayoutEntry>`, `WIDGET_IDS: WidgetId[]`, `STORAGE_KEY: string`, `ShellMetricsInput { viewportWidth, viewportHeight, inset }`, `computeDefaultLayout(metrics): WidgetLayout`, `parseStoredLayout(raw, defaults): WidgetLayout`, `serializeLayout(layout): string`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/widgetLayoutSchema.test.ts
import assert from "node:assert/strict";
import {
  WIDGET_IDS,
  computeDefaultLayout,
  parseStoredLayout,
  serializeLayout,
} from "./widgetLayoutSchema.ts";

// computeDefaultLayout — reconstructs today's fixed arrangement
const metrics = { viewportWidth: 1440, viewportHeight: 900, inset: 20 };
const defaults = computeDefaultLayout(metrics);
for (const id of WIDGET_IDS) assert.ok(defaults[id], `missing default for ${id}`);
assert.equal(defaults.photo.x, 20); // left column, inset
assert.equal(defaults.photo.y, 60); // inset + 40
assert.equal(defaults.nowPlaying.y, 60 + 260 + 14); // below photo (medium height) + gap
assert.equal(defaults.aiTools.x, 1440 - 20 - 260); // right column
assert.equal(defaults.clock.y, 60 + 176 + 14); // below aiTools (medium height) + gap
assert.equal(defaults.nowPlaying.size, "large"); // today's shipped behavior includes lyrics
assert.equal(defaults.motivation.size, "medium");

// serializeLayout round-trips through parseStoredLayout
const serialized = serializeLayout(defaults);
const parsedBack = parseStoredLayout(serialized, defaults);
assert.deepEqual(parsedBack, defaults);

// parseStoredLayout — null/missing raw falls back to defaults entirely
assert.deepEqual(parseStoredLayout(null, defaults), defaults);

// parseStoredLayout — corrupted JSON falls back to defaults entirely
assert.deepEqual(parseStoredLayout("{not valid json", defaults), defaults);

// parseStoredLayout — one malformed entry falls back only for that widget
const partiallyBad = JSON.stringify({
  ...defaults,
  clock: { x: "not-a-number", y: 0, size: "medium" },
});
const partialResult = parseStoredLayout(partiallyBad, defaults);
assert.deepEqual(partialResult.clock, defaults.clock); // fell back
assert.deepEqual(partialResult.photo, defaults.photo); // untouched, still the saved value

console.log("widgetLayoutSchema: all assertions passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node lib/widgetLayoutSchema.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/widgetLayoutSchema.ts
import { getSizeDimensions, type WidgetId, type WidgetSize } from "./widgetSizeTiers";

export type { WidgetId, WidgetSize };

export interface WidgetLayoutEntry {
  x: number;
  y: number;
  size: WidgetSize;
}

export type WidgetLayout = Record<WidgetId, WidgetLayoutEntry>;

export const WIDGET_IDS: WidgetId[] = ["photo", "nowPlaying", "aiTools", "clock", "motivation"];

// Versioned — a future schema change bumps this suffix and simply
// falls back to defaults for old keys, no migration needed.
export const STORAGE_KEY = "portfolio-widget-layout-v1";

export interface ShellMetricsInput {
  viewportWidth: number;
  viewportHeight: number;
  inset: number;
}

// Bottom clearance above the Dock — same value as
// WindowManagerContext.BOTTOM_RESERVE, duplicated here (not imported)
// because contexts/ isn't reachable from lib/ without a client-only
// import; kept in sync by the same design-system doc both cite.
const BOTTOM_RESERVE = 110;
const WIDGET_GAP = 14;

// Mirrors the exact math DesktopWidgetStack/RightWidgetStack/
// MotivationWidget used before this feature existed, so a first-time
// visitor's canvas renders pixel-identical to today's fixed layout —
// nothing visually changes until they actually drag or resize
// something.
export function computeDefaultLayout(metrics: ShellMetricsInput): WidgetLayout {
  const topY = metrics.inset + 40;
  const leftX = metrics.inset;
  const photoHeight = getSizeDimensions("photo", "medium").height!;
  const nowPlayingY = topY + photoHeight + WIDGET_GAP;

  const aiToolsWidth = getSizeDimensions("aiTools", "medium").width;
  const aiToolsHeight = getSizeDimensions("aiTools", "medium").height!;
  const rightX = metrics.viewportWidth - metrics.inset - aiToolsWidth;
  const clockY = topY + aiToolsHeight + WIDGET_GAP;

  const motivation = getSizeDimensions("motivation", "medium");
  const motivationX = metrics.viewportWidth - metrics.inset - motivation.width;
  const motivationY = metrics.viewportHeight - BOTTOM_RESERVE - motivation.height!;

  return {
    photo: { x: leftX, y: topY, size: "medium" },
    // "large" here is what ships today — NowPlayingWidget always
    // renders its lyrics panel currently; that becomes this tier.
    nowPlaying: { x: leftX, y: nowPlayingY, size: "large" },
    aiTools: { x: rightX, y: topY, size: "medium" },
    clock: { x: rightX, y: clockY, size: "medium" },
    motivation: { x: motivationX, y: motivationY, size: "medium" },
  };
}

const VALID_SIZES: WidgetSize[] = ["small", "medium", "large"];

function isValidEntry(value: unknown): value is WidgetLayoutEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.x === "number" &&
    Number.isFinite(entry.x) &&
    typeof entry.y === "number" &&
    Number.isFinite(entry.y) &&
    typeof entry.size === "string" &&
    VALID_SIZES.includes(entry.size as WidgetSize)
  );
}

// Pure — takes the raw localStorage string (or null) and the
// defaults for this viewport, returns a fully valid WidgetLayout.
// Any missing or malformed per-widget entry falls back to that
// widget's own default individually, so one corrupted entry never
// blanks the whole layout.
export function parseStoredLayout(raw: string | null, defaults: WidgetLayout): WidgetLayout {
  if (!raw) return defaults;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaults;
  }
  if (typeof parsed !== "object" || parsed === null) return defaults;
  const result = {} as WidgetLayout;
  for (const id of WIDGET_IDS) {
    const candidate = (parsed as Record<string, unknown>)[id];
    result[id] = isValidEntry(candidate) ? candidate : defaults[id];
  }
  return result;
}

export function serializeLayout(layout: WidgetLayout): string {
  return JSON.stringify(layout);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node lib/widgetLayoutSchema.test.ts`
Expected: `widgetLayoutSchema: all assertions passed`

- [ ] **Step 5: Verify the rest of the project still compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/widgetLayoutSchema.ts lib/widgetLayoutSchema.test.ts
git commit -m "feat: add widget layout schema (defaults, parse, serialize)"
```

---

### Task 4: `WidgetLayoutContext`

**Files:**
- Create: `contexts/WidgetLayoutContext.tsx`

**Interfaces:**
- Consumes: everything from `lib/widgetLayoutSchema.ts` (Task 3), `lib/widgetPositioning.ts`'s `clampToBounds`/`Bounds` (Task 2), `WindowManagerContext.tsx`'s `TOP_BOUND`/`BOTTOM_RESERVE` pattern (read-only reference, not imported — `TOP_BOUND` isn't currently exported; export it alongside `BOTTOM_RESERVE` as part of this task), `useShellMetrics()` from `lib/useShellMetrics.ts`.
- Produces: `WidgetLayoutProvider`, `useWidgetLayout()` returning `{ layout, isEditing, enterEditMode, exitEditMode, updatePosition, updateSize, resetLayout }`.

- [ ] **Step 1: Export `TOP_BOUND` from `WindowManagerContext.tsx`**

`contexts/WindowManagerContext.tsx:46` currently has:

```ts
const TOP_BOUND = 30;
```

Change to:

```ts
// Exported alongside BOTTOM_RESERVE — WidgetLayoutContext reuses both
// rather than picking its own MenuBar/Dock clearance values.
export const TOP_BOUND = 30;
```

- [ ] **Step 2: Verify existing code still compiles after the export change**

Run: `npx tsc --noEmit`
Expected: no errors (widening `const` to `export const` never breaks existing usages).

- [ ] **Step 3: Write `WidgetLayoutContext.tsx`**

```tsx
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
```

- [ ] **Step 4: Verify the project compiles**

Run: `npx tsc --noEmit`
Expected: no errors. (This context isn't mounted anywhere yet — Task 12 wires it into `AppShell`; a standalone compile check is all that's meaningful here.)

- [ ] **Step 5: Commit**

```bash
git add contexts/WidgetLayoutContext.tsx contexts/WindowManagerContext.tsx
git commit -m "feat: add WidgetLayoutContext (localStorage-backed widget layout state)"
```

---

### Task 5: `useLongPress` hook

**Files:**
- Create: `lib/useLongPress.ts`

**Interfaces:**
- Produces: `useLongPress(onLongPress: () => void): { onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onClickCapture }` (all `React.PointerEventHandler`/`React.MouseEventHandler`, spreadable onto any element).

- [ ] **Step 1: Write the implementation**

(No pure-Node test here — this is fundamentally a DOM pointer-event state machine; verified via `tsc` + manual check once wired into `WidgetFrame` in Task 6.)

```ts
// lib/useLongPress.ts
"use client";

import { useRef, useCallback } from "react";

// Matches iOS's own jiggle-mode threshold.
const LONG_PRESS_MS = 500;
// Any pointer movement past this (px) before the timer fires cancels
// the long-press — a drag/scroll gesture shouldn't also trigger edit
// mode.
const MOVE_CANCEL_THRESHOLD = 10;

export function useLongPress(onLongPress: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    startPos.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      firedRef.current = false;
      startPos.current = { x: e.clientX, y: e.clientY };
      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        onLongPress();
      }, LONG_PRESS_MS);
    },
    [onLongPress]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startPos.current) return;
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      if (Math.hypot(dx, dy) > MOVE_CANCEL_THRESHOLD) clear();
    },
    [clear]
  );

  const onPointerUp = useCallback(() => clear(), [clear]);
  const onPointerLeave = useCallback(() => clear(), [clear]);

  // Suppresses the click that follows a completed long-press, so
  // holding an interactive child (e.g. NowPlayingWidget's play
  // button) enters edit mode instead of also firing that child's own
  // click action — matches real iOS: a hold enters jiggle mode, only
  // a short tap activates the element.
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (firedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      firedRef.current = false;
    }
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onClickCapture };
}
```

- [ ] **Step 2: Verify the project compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/useLongPress.ts
git commit -m "feat: add useLongPress hook (jiggle-mode entry gesture)"
```

---

### Task 6: `WidgetFrame` — jiggle, drag, resize chrome

**Files:**
- Create: `components/widgets/WidgetFrame.tsx`

**Interfaces:**
- Consumes: `useWidgetLayout()` (Task 4), `useLongPress()` (Task 5), `computeAlignmentSnap`/`snapToGrid`/`clampToBounds`/`Rect`/`AlignmentGuide` (Task 2), `nearestSizeTier`/`getSizeDimensions`/`WIDGET_SIZE_TIERS` (Task 1), `WidgetId`/`WidgetSize` (Task 3).
- Produces: `<WidgetFrame id={WidgetId}>{children}</WidgetFrame>` — renders its child (the actual widget component) at the layout-context-driven position/size, with jiggle/drag/resize chrome layered around it. Widget components receive their `size` via a render-prop-style children function: `children: (size: WidgetSize) => ReactNode`.

- [ ] **Step 1: Write the implementation**

**Important correctness note (caught in self-review, before implementation):** don't mix CSS `left`/`top` with Framer Motion's `drag` — `drag` moves an element via a `transform: translate(x, y)` layered on top of whatever `left`/`top` already is, and `onDrag`/`onDragEnd`'s `info.point` is the *pointer's* page coordinate, not the element's own corner position. Using `info.point` directly as the widget's new `x`/`y` (an early draft of this task did) silently conflates "where the cursor is" with "where the box's corner is," and reading `left`/`top` back out after a `transform`-based drag leaves the two positioning systems fighting each other on the next drag. The fix below drives position entirely through Framer's own `x`/`y` motion values (via the `animate` prop, kept in sync with `WidgetLayoutContext`'s stored absolute position) and reads `info.offset` (the drag delta) instead of `info.point`.

```tsx
// components/widgets/WidgetFrame.tsx
"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import { motion, useReducedMotion, type PanInfo } from "framer-motion";
import { useWidgetLayout } from "@/contexts/WidgetLayoutContext";
import { useLongPress } from "@/lib/useLongPress";
import { computeAlignmentSnap, snapToGrid, type Rect, type AlignmentGuide } from "@/lib/widgetPositioning";
import { getSizeDimensions, nearestSizeTier, WIDGET_SIZE_TIERS } from "@/lib/widgetSizeTiers";
import type { WidgetId, WidgetSize } from "@/lib/widgetLayoutSchema";

// New preset for this feature — see docs/design-system/motion.md's
// existing vocabulary; close to `tapPress` (400/17) but more damped,
// since a widget locking into a grid position should feel firm and
// precise, not bouncy.
const WIDGET_SNAP_SPRING = { type: "spring", stiffness: 400, damping: 32 } as const;
const EXIT_JIGGLE_SPRING = { type: "spring", stiffness: 400, damping: 17 } as const;

interface WidgetFrameProps {
  id: WidgetId;
  otherRects: Rect[]; // every other widget's current on-screen rect, for alignment-guide comparison
  onGuidesChange: (guides: AlignmentGuide[]) => void;
  children: (size: WidgetSize) => React.ReactNode;
}

export default function WidgetFrame({ id, otherRects, onGuidesChange, children }: WidgetFrameProps) {
  const { layout, isEditing, enterEditMode, updatePosition, updateSize } = useWidgetLayout();
  const prefersReducedMotion = useReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);
  const [liveSize, setLiveSize] = useState<{ width: number; height: number } | null>(null);
  const resizingRef = useRef(false);

  const entry = layout[id];
  const dims = getSizeDimensions(id, entry.size);
  const width = liveSize?.width ?? dims.width;
  const height = liveSize?.height ?? dims.height;

  const longPress = useLongPress(enterEditMode);

  // Jiggle: each widget's own cycle duration (0.13s-0.19s band,
  // deterministic per id rather than Math.random() so server/client
  // never disagree) — the slight per-widget desync is what keeps a
  // multi-widget jiggle from looking robotic, matching real iOS.
  const jiggleDuration = useMemo(() => {
    const seed = id.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return 0.13 + (seed % 7) * 0.01; // 0.13 - 0.19
  }, [id]);

  // entry.x/entry.y is the widget's current committed position (the
  // same value driving the `animate` x/y below); info.offset is the
  // drag's cumulative delta since it started — adding them gives the
  // widget's live on-screen corner position, never the raw pointer
  // coordinate.
  const handleDrag = useCallback(
    (_: unknown, info: PanInfo) => {
      const liveX = entry.x + info.offset.x;
      const liveY = entry.y + info.offset.y;
      const rect: Rect = { x: liveX, y: liveY, width, height: height ?? 0 };
      const snap = computeAlignmentSnap(rect, otherRects);
      onGuidesChange(snap.guides);
    },
    [entry.x, entry.y, width, height, otherRects, onGuidesChange]
  );

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const liveX = entry.x + info.offset.x;
      const liveY = entry.y + info.offset.y;
      const rect: Rect = { x: liveX, y: liveY, width, height: height ?? 0 };
      const snap = computeAlignmentSnap(rect, otherRects);
      const finalX = snap.guides.some((g) => g.axis === "x") ? snap.x : snapToGrid(snap.x);
      const finalY = snap.guides.some((g) => g.axis === "y") ? snap.y : snapToGrid(snap.y);
      onGuidesChange([]);
      updatePosition(id, finalX, finalY);
    },
    [entry.x, entry.y, width, height, otherRects, onGuidesChange, updatePosition, id]
  );

  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (!resizingRef.current || !frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    setLiveSize({
      width: Math.max(120, e.clientX - rect.left),
      height: Math.max(80, e.clientY - rect.top),
    });
  }, []);

  const handleResizeEnd = useCallback(() => {
    resizingRef.current = false;
    if (liveSize) {
      const nearest = nearestSizeTier(WIDGET_SIZE_TIERS[id], liveSize.width, liveSize.height);
      updateSize(id, nearest);
    }
    setLiveSize(null);
  }, [id, liveSize, updateSize]);

  return (
    <motion.div
      ref={frameRef}
      drag={isEditing}
      dragMomentum={false}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onPointerDown={longPress.onPointerDown}
      onPointerMove={(e) => {
        longPress.onPointerMove(e);
        handleResizeMove(e);
      }}
      onPointerUp={(e) => {
        longPress.onPointerUp();
        handleResizeEnd();
      }}
      onPointerLeave={longPress.onPointerLeave}
      onClickCapture={longPress.onClickCapture}
      // Position is driven entirely by x/y here (transform-based),
      // never by CSS left/top — the one and only source of truth for
      // "where this widget is" is WidgetLayoutContext's entry.x/y,
      // read back in on every render. rotate is the jiggle wiggle
      // (or 0 when not editing / reduced-motion).
      animate={{
        x: entry.x,
        y: entry.y,
        rotate: isEditing && !prefersReducedMotion ? [-1.5, 1.5, -1.5] : 0,
      }}
      transition={{
        x: WIDGET_SNAP_SPRING,
        y: WIDGET_SNAP_SPRING,
        rotate:
          isEditing && !prefersReducedMotion
            ? { duration: jiggleDuration, repeat: Infinity, ease: "easeInOut" }
            : EXIT_JIGGLE_SPRING,
      }}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width,
        height,
        zIndex: isEditing ? 30 : 20,
        touchAction: isEditing ? "none" : undefined,
      }}
    >
      {children(entry.size)}

      {isEditing && (
        <div
          role="button"
          aria-label={`Resize ${id} widget`}
          onPointerDown={(e) => {
            e.stopPropagation();
            resizingRef.current = true;
          }}
          style={{
            position: "absolute",
            right: -6,
            bottom: -6,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "var(--glass-regular-bg)",
            border: "1px solid var(--glass-border)",
            cursor: "nwse-resize",
            touchAction: "none",
          }}
        />
      )}
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify the project compiles**

Run: `npx tsc --noEmit`
Expected: no errors. (Not mounted anywhere yet — Task 12 wires it in.)

- [ ] **Step 3: Commit**

```bash
git add components/widgets/WidgetFrame.tsx
git commit -m "feat: add WidgetFrame (jiggle + drag-reposition + resize-handle chrome)"
```

---

### Task 7: `PhotoWidget` — add `size` prop, 3 tiers

**Files:**
- Modify: `components/widgets/PhotoWidget.tsx`

**Interfaces:**
- Consumes: `WidgetSize` from `lib/widgetLayoutSchema.ts`, `getSizeDimensions("photo", size)` from `lib/widgetSizeTiers.ts`.
- Produces: `PhotoWidget` now takes `{ size: WidgetSize }` (no default — the caller, `WidgetCanvas` in Task 12, always supplies it).

- [ ] **Step 1: Update the component**

Current `components/widgets/PhotoWidget.tsx` hardcodes `WIDGET_UNIT`/`WIDGET_RADIUS` at a fixed 260×260. Replace the size-related lines:

```tsx
// components/widgets/PhotoWidget.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { WIDGET_RADIUS } from "@/lib/widgetGrid";
import { getSizeDimensions } from "@/lib/widgetSizeTiers";
import type { WidgetSize } from "@/lib/widgetLayoutSchema";

/* macOS "Photos" widget — a single photo, edge to edge, no text.
   Liquid Glass isn't appropriate here (a photo widget is opaque, not
   translucent, in real macOS) — just a squircle-clipped image with a
   soft shadow. See docs/design-system/materials-glass.md.

   All 3 size tiers are the same forced-square shape (155/260/338),
   just more of the photo visible at larger sizes — matches Apple's
   real Photos widget, which crops the same source image tighter or
   looser per size rather than changing layout.

   Shadow is deliberately tight (small blur/offset), not a big diffuse
   glow: real macOS desktop widgets rest close to the surface rather
   than levitating dramatically. */

export default function PhotoWidget({ size }: { size: WidgetSize }) {
  const [hovered, setHovered] = useState(false);
  const dims = getSizeDimensions("photo", size);

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0, 0, 0.58, 1] }}
      whileHover={{ scale: 1.015, y: -2 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        width: `${dims.width}px`,
        height: `${dims.height}px`,
        borderRadius: `${WIDGET_RADIUS}px`,
        overflow: "hidden",
        boxShadow: hovered
          ? "0 6px 18px rgba(0, 0, 0, 0.34)"
          : "0 4px 12px rgba(0, 0, 0, 0.28)",
        transition: "box-shadow 0.22s ease",
      }}
    >
      <img
        src="/photos/my_photo.jpeg"
        alt="Shajith"
        decoding="async"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center 10%",
          display: "block",
        }}
      />
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify the project compiles**

Run: `npx tsc --noEmit`
Expected: errors at every current call site of `<PhotoWidget />` (missing required `size` prop) — this is expected; `AppShell.tsx`'s call site is fixed in Task 12. Confirm the ONLY errors are missing-prop errors at known call sites, nothing else.

- [ ] **Step 3: Commit**

```bash
git add components/widgets/PhotoWidget.tsx
git commit -m "feat: add size-tier support to PhotoWidget"
```

---

### Task 8: `NowPlayingWidget` — add `size` prop, 3 tiers

**Files:**
- Modify: `components/widgets/NowPlayingWidget.tsx`

**Interfaces:**
- Consumes: `WidgetSize`, `getSizeDimensions("nowPlaying", size)`.
- Produces: `NowPlayingWidget` now takes `{ size: WidgetSize }`.

- [ ] **Step 1: Update the component**

Add the import and prop, branch the render. Keep all existing audio/scrubber/volume logic exactly as-is (all hooks stay unconditional, at the top, regardless of size — only the JSX returned changes) — only the `size==="small"` branch and the `size==="medium"` (drop `<LyricsPanel />`) vs `size==="large"` (unchanged, keep `<LyricsPanel />`) branches are new.

At the top of the file, add:

```tsx
import { WIDGET_UNIT, WIDGET_PADDING, WIDGET_RADIUS } from "@/lib/widgetGrid";
import { getSizeDimensions } from "@/lib/widgetSizeTiers";
import type { WidgetSize } from "@/lib/widgetLayoutSchema";
```

Change the function signature:

```tsx
export default function NowPlayingWidget({ size }: { size: WidgetSize }) {
```

After all existing hooks/handlers (unchanged), replace the final `return (...)` block's outer `motion.div` to branch on `size === "small"` first:

```tsx
  if (size === "small") {
    const dims = getSizeDimensions("nowPlaying", "small");
    return (
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={ENTRANCE_SPRING}
        style={{
          position: "relative",
          width: `${dims.width}px`,
          height: `${dims.height}px`,
          borderRadius: `${WIDGET_RADIUS}px`,
          overflow: "hidden",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.28)",
        }}
      >
        <audio
          ref={audioRef}
          src={NOW_PLAYING.src}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={(e) => {
            setPlaying(false);
            e.currentTarget.currentTime = 0;
          }}
        />
        {NOW_PLAYING.artwork ? (
          <img
            src={NOW_PLAYING.artwork}
            alt={NOW_PLAYING.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(160deg, #FF7A45 0%, #7A1F00 100%)",
            }}
          >
            <MusicNoteGlyph />
          </div>
        )}
        {/* Single tap target, matching real Apple Music's own Small
            widget — no scrubber, no lyrics, no volume at this tier. */}
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          style={{
            position: "absolute",
            right: "8px",
            bottom: "8px",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(8px)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {playing ? <PauseGlyph /> : <PlayGlyph />}
        </button>
      </motion.div>
    );
  }
```

Insert this block immediately before the existing `return (` for the full layout. Then change that existing full-layout `return`'s outer `motion.div` width from `` `${WIDGET_UNIT}px` `` (unchanged — still fixed 260) and, at the very end (right before the widget's closing `</motion.div>`), change:

```tsx
      <LyricsPanel audioRef={audioRef} playing={playing} />
```

to:

```tsx
      {size === "large" && <LyricsPanel audioRef={audioRef} playing={playing} />}
```

- [ ] **Step 2: Verify the project compiles**

Run: `npx tsc --noEmit`
Expected: errors only at `<NowPlayingWidget />`'s current call site (missing `size` prop) — fixed in Task 12.

- [ ] **Step 3: Commit**

```bash
git add components/widgets/NowPlayingWidget.tsx
git commit -m "feat: add size-tier support to NowPlayingWidget"
```

---

### Task 9: `AIToolsWidget` — add `size` prop, 3 tiers

**Files:**
- Modify: `components/widgets/AIToolsWidget.tsx`

**Interfaces:**
- Consumes: `WidgetSize`, `getSizeDimensions("aiTools", size)`.
- Produces: `AIToolsWidget` now takes `{ size: WidgetSize }`.

- [ ] **Step 1: Update the component**

```tsx
// components/widgets/AIToolsWidget.tsx
"use client";

import { motion } from "framer-motion";
import { AI_TOOLS } from "@/data/aiTools";
import { WIDGET_PADDING, WIDGET_RADIUS } from "@/lib/widgetGrid";
import { getSizeDimensions } from "@/lib/widgetSizeTiers";
import type { WidgetSize } from "@/lib/widgetLayoutSchema";

/* macOS "App Shortcuts" / Quick Access-style widget. See prior commit
   history for the icon-sizing/Liquid-Glass research this is built on.

   Size tiers (real per-tier icon-count math, not a CSS scale-up):
     - small:  2x2 grid, first 4 tools, 53px icons (computed: 16px
       padding x2 + 2 rows x 53 + 1 gap x16 = 154, ~matches the 155px
       frame with 1px slack absorbed by align-items:center).
     - medium: 3x2 grid, 6 tools, 64px icons (today's layout,
       unchanged).
     - large:  3x3 grid, 9-tool capacity, same 64px icons as medium —
       more capacity for AI_TOOLS to grow into, not bigger tiles
       (260px width is a hard column constraint, so "large" for this
       widget means more rows, matching how real Apple widgets in a
       family usually show more items at Large rather than the same
       items scaled up). */

const ICON_SIZE_BY_TIER: Record<WidgetSize, number> = { small: 53, medium: 64, large: 64 };
const TOOL_COUNT_BY_TIER: Record<WidgetSize, number> = { small: 4, medium: 6, large: 9 };
const ENTRANCE_SPRING = { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 } as const;

export default function AIToolsWidget({ size }: { size: WidgetSize }) {
  const dims = getSizeDimensions("aiTools", size);
  const iconSize = ICON_SIZE_BY_TIER[size];
  const tools = AI_TOOLS.slice(0, TOOL_COUNT_BY_TIER[size]);

  return (
    <motion.div
      className="glass-hero-refraction"
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={ENTRANCE_SPRING}
      style={{
        width: `${dims.width}px`,
        height: `${dims.height}px`,
        padding: `${WIDGET_PADDING}px`,
        borderRadius: `${WIDGET_RADIUS}px`,
        background: "var(--glass-regular-bg)",
        border: "1px solid var(--glass-border)",
        display: "flex",
        alignItems: "center",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "center", width: "100%" }}>
        {tools.map((tool) => (
          <motion.button
            key={tool.name}
            onClick={() => window.open(tool.url, "_blank", "noopener,noreferrer")}
            title={tool.name}
            aria-label={tool.name}
            whileTap={{ scale: 0.9 }}
            style={{
              width: `${iconSize}px`,
              height: `${iconSize}px`,
              padding: 0,
              border: "none",
              background: "none",
              cursor: "pointer",
            }}
          >
            <img
              src={`/icons/${tool.file}.png`}
              alt={tool.name}
              draggable={false}
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify the project compiles**

Run: `npx tsc --noEmit`
Expected: errors only at `<AIToolsWidget />`'s current call site (missing `size` prop) — fixed in Task 12.

- [ ] **Step 3: Commit**

```bash
git add components/widgets/AIToolsWidget.tsx
git commit -m "feat: add size-tier support to AIToolsWidget"
```

---

### Task 10: `ClockWidget` — add `size` prop, 3 tiers

**Files:**
- Modify: `components/widgets/ClockWidget.tsx`

**Interfaces:**
- Consumes: `WidgetSize`, `getSizeDimensions("clock", size)`.
- Produces: `ClockWidget` now takes `{ size: WidgetSize }`.

- [ ] **Step 1: Update the component**

```tsx
// components/widgets/ClockWidget.tsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { WIDGET_RADIUS } from "@/lib/widgetGrid";
import { getSizeDimensions } from "@/lib/widgetSizeTiers";
import type { WidgetSize } from "@/lib/widgetLayoutSchema";

/* ... existing header comment unchanged ... */

const ENTRANCE_SPRING = { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 } as const;

function useLiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function ClockWidget({ size }: { size: WidgetSize }) {
  const now = useLiveClock();
  const dims = getSizeDimensions("clock", size);

  const timeLabel = now
    ? now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
    : "--:--";
  const dayLabel = now ? now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase() : "";
  const dateLabel = now ? now.toLocaleDateString("en-US", { month: "long", day: "numeric" }).toUpperCase() : "";

  // Small: time only, no day/date — matches real Apple Clock
  // widget's own small size (single glanceable fact, per HIG's
  // small=single-focus rule). Font scaled down proportionally from
  // medium's 76px by the width ratio (155/260) — same Inter Tight
  // Medium already chosen for this widget, not a new font.
  const timeFontSize = size === "small" ? 44 : size === "large" ? 88 : 76;

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={ENTRANCE_SPRING}
      style={{
        position: "relative",
        width: `${dims.width}px`,
        height: dims.height ? `${dims.height}px` : undefined,
        padding: size === "small" ? "16px" : "0 18px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        borderRadius: `${WIDGET_RADIUS}px`,
        background: "linear-gradient(165deg, rgba(100, 176, 255, 0.68) 0%, rgba(10, 82, 190, 0.78) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        backdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
        WebkitBackdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.14)",
        overflow: "hidden",
        textAlign: "left",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(120% 70% at 50% -10%, rgba(255, 255, 255, 0.16), transparent 60%)",
          pointerEvents: "none",
        }}
      />

      <p
        className="glass-clock-time"
        style={{
          position: "relative",
          margin: 0,
          fontFamily: "var(--font-inter-tight), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          fontWeight: 500,
          fontSize: `${timeFontSize}px`,
          lineHeight: 0.95,
          letterSpacing: "0",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {timeLabel}
      </p>

      {size !== "small" && (
        <>
          <p
            style={{
              position: "relative",
              zIndex: 1,
              margin: "-30px 0 0 0",
              fontFamily: "var(--font-caveat), cursive",
              fontWeight: 600,
              fontSize: "36px",
              lineHeight: 1,
              color: "rgba(30, 75, 190, 0.95)",
              textShadow: "0 1px 3px rgba(255, 255, 255, 0.25)",
            }}
          >
            {dayLabel}
          </p>
          <p
            style={{
              position: "relative",
              margin: "6px 0 0 0",
              fontFamily: "var(--font-inter-tight), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.16em",
              color: "rgba(40, 90, 200, 0.9)",
            }}
          >
            {dateLabel}
          </p>
        </>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify the project compiles**

Run: `npx tsc --noEmit`
Expected: errors only at `<ClockWidget />`'s current call site (missing `size` prop) — fixed in Task 12.

- [ ] **Step 3: Commit**

```bash
git add components/widgets/ClockWidget.tsx
git commit -m "feat: add size-tier support to ClockWidget"
```

---

### Task 11: `MotivationWidget` — add `size` prop, 2 tiers

**Files:**
- Modify: `components/widgets/MotivationWidget.tsx`

**Interfaces:**
- Consumes: `WidgetSize` (only `"medium"|"large"` are meaningful — `"small"` never gets passed to this widget, enforced by `WidgetCanvas` in Task 12 only ever reading `supportedSizes("motivation")`), `getSizeDimensions("motivation", size)`.
- Produces: `MotivationWidget` now takes `{ size: Extract<WidgetSize, "medium" | "large"> }`.

- [ ] **Step 1: Update the component**

Remove the `position: "fixed"` / `bottom`/`right` positioning (that's now `WidgetFrame`'s job in Task 12, same as every other widget) and the `FRAME_WIDTH`/`FRAME_HEIGHT` local constants:

```tsx
// components/widgets/MotivationWidget.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { getSizeDimensions } from "@/lib/widgetSizeTiers";
import { MOTIVATION_IMAGE } from "@/data/motivation";

/* macOS "Photos" widget, right-hand side — same opaque, edge-to-edge
   treatment as PhotoWidget. No "small" tier — a 155px crop would
   likely make the quote baked into the image pixels illegible; only
   medium (today's tuned 210px) and large exist for this widget. */

export default function MotivationWidget({ size }: { size: "medium" | "large" }) {
  const [hovered, setHovered] = useState(false);
  const dims = getSizeDimensions("motivation", size);

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.05, ease: [0, 0, 0.58, 1] }}
      whileHover={{ scale: 1.015, y: -2 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        width: `${dims.width}px`,
        height: `${dims.height}px`,
        borderRadius: "20px",
        overflow: "hidden",
        boxShadow: hovered
          ? "0 6px 18px rgba(0, 0, 0, 0.34)"
          : "0 4px 12px rgba(0, 0, 0, 0.28)",
        transition: "box-shadow 0.22s ease",
      }}
    >
      <img
        src={MOTIVATION_IMAGE.src}
        alt={MOTIVATION_IMAGE.alt}
        decoding="async"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }}
      />
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify the project compiles**

Run: `npx tsc --noEmit`
Expected: errors only at `<MotivationWidget />`'s current call site (missing `size` prop, and the `BOTTOM_RESERVE`/`useShellMetrics` imports in `AppShell.tsx` for its old positioning becoming unused) — fixed in Task 12.

- [ ] **Step 3: Commit**

```bash
git add components/widgets/MotivationWidget.tsx
git commit -m "feat: add size-tier support to MotivationWidget"
```

---

### Task 12: `WidgetCanvas` + wire into `AppShell`

**Files:**
- Create: `components/widgets/WidgetCanvas.tsx`
- Modify: `components/layout/AppShell.tsx`
- Delete: `components/widgets/DesktopWidgetStack.tsx`, `components/widgets/RightWidgetStack.tsx`

**Interfaces:**
- Consumes: `WidgetLayoutProvider`/`useWidgetLayout` (Task 4), `WidgetFrame` (Task 6), all 5 updated widget components (Tasks 7-11).
- Produces: `<WidgetCanvas />` — self-contained, no props (reads everything from `useWidgetLayout()`).

- [ ] **Step 1: Write `WidgetCanvas.tsx`**

```tsx
// components/widgets/WidgetCanvas.tsx
"use client";

import { useState, useCallback } from "react";
import { useWidgetLayout } from "@/contexts/WidgetLayoutContext";
import { getSizeDimensions } from "@/lib/widgetSizeTiers";
import type { AlignmentGuide, Rect } from "@/lib/widgetPositioning";
import type { WidgetId } from "@/lib/widgetLayoutSchema";
import WidgetFrame from "@/components/widgets/WidgetFrame";
import PhotoWidget from "@/components/widgets/PhotoWidget";
import NowPlayingWidget from "@/components/widgets/NowPlayingWidget";
import AIToolsWidget from "@/components/widgets/AIToolsWidget";
import ClockWidget from "@/components/widgets/ClockWidget";
import MotivationWidget from "@/components/widgets/MotivationWidget";

const WIDGET_IDS: WidgetId[] = ["photo", "nowPlaying", "aiTools", "clock", "motivation"];

export default function WidgetCanvas() {
  const { layout, isEditing, exitEditMode, resetLayout } = useWidgetLayout();
  const [guides, setGuides] = useState<AlignmentGuide[]>([]);

  const rectFor = useCallback(
    (id: WidgetId): Rect => {
      const entry = layout[id];
      const dims = getSizeDimensions(id, entry.size);
      return { x: entry.x, y: entry.y, width: dims.width, height: dims.height ?? 0 };
    },
    [layout]
  );

  return (
    <div
      // Tapping empty canvas space (not a widget — widgets stop this
      // click via WidgetFrame's own onClick handling) exits edit mode.
      onClick={() => isEditing && exitEditMode()}
      style={{ position: "fixed", inset: 0, zIndex: 20, pointerEvents: isEditing ? "auto" : "none" }}
    >
      {WIDGET_IDS.map((id) => {
        const otherRects = WIDGET_IDS.filter((other) => other !== id).map(rectFor);
        return (
          <div key={id} style={{ pointerEvents: "auto" }}>
            <WidgetFrame id={id} otherRects={otherRects} onGuidesChange={setGuides}>
              {(size) => {
                if (id === "photo") return <PhotoWidget size={size} />;
                if (id === "nowPlaying") return <NowPlayingWidget size={size} />;
                if (id === "aiTools") return <AIToolsWidget size={size} />;
                if (id === "clock") return <ClockWidget size={size} />;
                return <MotivationWidget size={size as "medium" | "large"} />;
              }}
            </WidgetFrame>
          </div>
        );
      })}

      {guides.map((guide, i) => (
        <div
          key={i}
          aria-hidden
          style={{
            position: "fixed",
            background: "var(--color-accent)",
            pointerEvents: "none",
            zIndex: 40,
            ...(guide.axis === "x"
              ? { left: guide.position, top: 0, width: "1px", height: "100vh" }
              : { top: guide.position, left: 0, height: "1px", width: "100vw" }),
          }}
        />
      ))}

      {isEditing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            resetLayout();
          }}
          style={{
            position: "fixed",
            top: "16px",
            right: "50%",
            transform: "translateX(50%)",
            zIndex: 40,
            padding: "8px 16px",
            borderRadius: "20px",
            background: "var(--glass-regular-bg)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-primary)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reset Layout
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire into `AppShell.tsx`**

In `components/layout/AppShell.tsx`, remove:

```tsx
import DesktopWidgetStack from "@/components/widgets/DesktopWidgetStack";
import RightWidgetStack from "@/components/widgets/RightWidgetStack";
import PhotoWidget from "@/components/widgets/PhotoWidget";
import NowPlayingWidget from "@/components/widgets/NowPlayingWidget";
import AIToolsWidget from "@/components/widgets/AIToolsWidget";
import ClockWidget from "@/components/widgets/ClockWidget";
import MotivationWidget from "@/components/widgets/MotivationWidget";
```

Add:

```tsx
import { WidgetLayoutProvider } from "@/contexts/WidgetLayoutContext";
import WidgetCanvas from "@/components/widgets/WidgetCanvas";
```

Replace:

```tsx
          {isHome && (
            <>
              <DesktopWidgetStack>
                <PhotoWidget />
                <NowPlayingWidget />
              </DesktopWidgetStack>
              <RightWidgetStack>
                <AIToolsWidget />
                <ClockWidget />
              </RightWidgetStack>
              <MotivationWidget />
            </>
          )}
```

with:

```tsx
          {isHome && (
            <WidgetLayoutProvider>
              <WidgetCanvas />
            </WidgetLayoutProvider>
          )}
```

- [ ] **Step 3: Delete the now-unused stack components**

```bash
rm components/widgets/DesktopWidgetStack.tsx components/widgets/RightWidgetStack.tsx
```

- [ ] **Step 4: Verify everything compiles and builds**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: clean build, no errors.

- [ ] **Step 5: Manual verification checklist**

Start the dev server (`npm run dev`), open the home page, and confirm:
- All 5 widgets render in their default positions, visually matching today's layout exactly (medium/large tiers as specced).
- Long-pressing any widget (hold ~500ms) makes all 5 widgets jiggle; a short tap/click on e.g. AIToolsWidget's Claude icon still opens claude.ai in a new tab (long-press didn't break normal clicks).
- While jiggling, dragging a widget moves it freely; dragging it near another widget's edge shows a thin guide line and snaps.
- While jiggling, dragging a widget's corner handle live-resizes it and snaps to the nearest tier on release.
- Tapping empty desktop space exits jiggle mode.
- Reloading the page after moving/resizing something restores the customized layout (localStorage persisted).
- "Reset Layout" (visible only in edit mode) restores the default arrangement.

- [ ] **Step 6: Commit**

```bash
git add components/widgets/WidgetCanvas.tsx components/layout/AppShell.tsx
git rm components/widgets/DesktopWidgetStack.tsx components/widgets/RightWidgetStack.tsx
git commit -m "feat: wire WidgetCanvas + WidgetLayoutContext into AppShell, remove fixed widget stacks"
```

---

## Self-review notes

- **Spec coverage:** architecture (Tasks 4, 12), interaction model incl. long-press-suppresses-click (Tasks 5, 6), positioning system incl. grid-snap/guides/exclusion zones (Tasks 2, 4, 6), all 5 widgets' size tiers (Tasks 1, 7-11), motion spec incl. jiggle desync/no-momentum-drag/widgetSnap/reduced-motion (Task 6), error handling incl. storage failures/corrupted entries/viewport clamping (Tasks 3, 4), Reset Layout (Task 12) — every spec section maps to a task.
- **Type consistency:** `WidgetId`/`WidgetSize` are defined once (`widgetSizeTiers.ts`) and re-exported from `widgetLayoutSchema.ts` rather than redeclared — every later task imports from one of these two places, never both independently.
- **No placeholders:** every step has runnable code; the only "TBD"-shaped item (exact ClockWidget small-tier font size) is a concrete chosen number (44px) with its derivation shown, in the same spirit as this session's own established practice of choosing a reasoned value and refining visually if needed — not an unresolved gap.
