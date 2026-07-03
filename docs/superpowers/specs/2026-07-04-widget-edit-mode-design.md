# Widget Edit Mode — Design Spec

> Per-visitor, no-login desktop widget customization (move + resize), matching real macOS/iOS jiggle-mode widget editing.

## Problem

The 5 desktop widgets (PhotoWidget, NowPlayingWidget, AIToolsWidget, ClockWidget, MotivationWidget) are locked into two fixed flex-column stacks (`DesktopWidgetStack`, `RightWidgetStack`) plus one independently bottom-anchored widget (MotivationWidget). Real macOS lets a user long-press/right-click into an "edit widgets" jiggle mode, drag any widget anywhere on the desktop with grid-snap guides, and resize it between discrete Small/Medium/Large layouts via a corner drag handle. This spec brings that same interaction to this portfolio, scoped to each visitor's own browser (no accounts, no server-side state) so one visitor's layout never affects another's.

## Scope

**In scope:** long-press to enter jiggle mode, freeform drag-to-reposition with grid-snap + alignment guides, corner-handle drag-to-resize across 3 (or 2, for MotivationWidget) discrete size tiers per widget, per-browser localStorage persistence, tap-empty-space to exit, a Reset Layout affordance.

**Out of scope (explicitly deferred, not part of this spec):** adding/removing widgets from a gallery, cross-device sync, a login/account system, editing widget *content* (e.g. which AI tools appear).

## Architecture

### `WidgetLayoutContext` (new)

Mirrors the existing `WindowManagerContext` pattern (`contexts/WindowManagerContext.tsx`) — same clamping/bounds philosophy, applied to widgets instead of windows.

```ts
export type WidgetSize = "small" | "medium" | "large";

export interface WidgetLayoutEntry {
  x: number;
  y: number;
  size: WidgetSize;
}

export type WidgetId = "photo" | "nowPlaying" | "aiTools" | "clock" | "motivation";

interface WidgetLayoutContextValue {
  layout: Record<WidgetId, WidgetLayoutEntry>;
  isEditing: boolean;
  enterEditMode: () => void;
  exitEditMode: () => void;
  updatePosition: (id: WidgetId, x: number, y: number) => void;
  updateSize: (id: WidgetId, size: WidgetSize) => void;
  resetLayout: () => void;
}
```

- **Default layout** (used when no saved layout exists, or a saved entry is missing/invalid): reconstructs today's exact visual arrangement — left column x/y for photo+nowPlaying, right column x/y for aiTools+clock, bottom-anchored x/y for motivation — all at `size: "medium"`. A brand-new visitor sees exactly what exists today; nothing changes until they touch something.
- **Persistence:** `localStorage["portfolio-widget-layout-v1"]`, a JSON-serialized `Record<WidgetId, WidgetLayoutEntry>`. Versioned key (`-v1` suffix) — a future schema change bumps the suffix and simply falls back to defaults for old keys, rather than needing a migration.
- **Load-time clamping:** every loaded entry is clamped against the *current* viewport bounds (reusing the exclusion-zone math below) before being applied — so a layout saved on a wide window never renders off-screen after a resize or on a different device.
- **Storage failures:** `localStorage` access is wrapped in try/catch. Private browsing / storage-disabled contexts silently fall back to in-memory-only state (edits work for the session, just don't persist across reloads) — never a thrown error or broken UI.
- **`resetLayout()`:** clears the localStorage key and re-applies the default layout with an animated transition (reusing the drop-settle spring below), not an abrupt jump.

### Replacing `DesktopWidgetStack` / `RightWidgetStack`

Both are replaced by a single `WidgetCanvas` component that reads `WidgetLayoutContext` and renders each widget absolutely positioned at its `layout[id].x/y`, sized per `layout[id].size`. `MotivationWidget`'s existing bottom-anchor special-case goes away — it becomes a normal canvas entry with a default position matching where it sits today.

## Interaction model

1. **Enter:** long-press (touch: `pointerdown` held ~500ms without significant movement, matching iOS's own jiggle-mode threshold) any widget. All 5 widgets enter jiggle mode together (matches real iOS — jiggling is a desktop-wide mode, not per-widget). Widgets have their own clickable children (NowPlayingWidget's play/pause/skip/mute, AIToolsWidget's tool icons, PhotoWidget/MotivationWidget's hover states) — the long-press timer suppresses those children's click handlers for that gesture (matching real iOS: holding an interactive widget element enters jiggle mode instead of firing its action; only a short tap fires it). Implementation-wise this means the long-press listener sits on each widget's outer wrapper and calls `stopPropagation`/prevents the subsequent click when the hold threshold is reached, not on individual buttons.
2. **Reposition:** while jiggling, dragging a widget's body moves it freely. `dragMomentum: false` — direct 1:1 pointer-follow, no inertial fling (real macOS widget drag has none). Grid-snap (8px) and smart alignment guides (see below) apply live during the drag; the widgetSnap spring animates the final settle after release.
3. **Resize:** while jiggling, a small corner handle appears at each widget's bottom-right corner (confirmed real iOS 18/iPadOS mechanic, not invented — see research note below). Dragging it live-resizes the widget continuously; on release, it snaps to whichever of that widget's supported size tiers is closest, animating via the widgetSnap spring.
4. **Exit:** tap/click empty desktop space (not on any widget). All widgets stop jiggling (quick settle via the `tapPress` spring) and the current layout is written to localStorage.

## Positioning system

- **Exclusion zones:** reuses `WindowManagerContext`'s existing `TOP_BOUND` (30px, MenuBar clearance) and `BOTTOM_RESERVE` (110px, Dock clearance) constants directly — no new offsets invented. Left/right bounds use `useShellMetrics().inset`, same as every other fixed-position element on this desktop.
- **Base grid:** 8px snap increment, matching this codebase's own documented 8pt spacing scale (`docs/design-system/layout.md`).
- **Smart alignment guides:** during a drag, the moving widget's edges and center are compared against every other widget's edges/center and the viewport edges. Within a 6px threshold, position snaps to the aligned value and a thin `--color-accent` guide line renders at that position (a real, temporary overlay element, not just a snap with no visual feedback) — this is the same smart-guide mechanic macOS uses for Finder icon arrangement and Keynote/Pages object alignment.
- **No hard overlap prevention:** matches real macOS, which doesn't forbid overlapping placement either — the grid + guides make clean non-overlapping placement the path of least resistance, which is sufficient.

## Per-widget size tiers

HIG rule (confirmed via research, not assumed): Small = single glanceable focus, at most one tap target. Medium/Large = progressively richer content, multiple tap targets allowed.

| Widget | Small | Medium (today's layout) | Large |
|---|---|---|---|
| PhotoWidget | 155×155 crop (Apple's literal systemSmall) | 260×260 (unchanged) | 338×338, more photo visible |
| NowPlayingWidget | Album art + play/pause only (matches Apple Music's real Small widget — one tap target) | Today's layout minus lyrics panel | Today's full layout incl. lyrics (matches Apple Music's real Large widget, which genuinely shows synced lyrics on iOS 16+) |
| AIToolsWidget | Top 4 tools, 2×2 grid (matches real App Shortcuts widget's small size) | Today's 3×2 grid (6 icons) | Same icons, larger tiles/more breathing room, headroom for growth past 6 |
| ClockWidget | Time only, no day/date (matches Apple's real Clock widget small size) | Today's full layout (time + day + date) | Larger type scale, more breathing room (Apple's own single-clock widget doesn't add new data at Large either — there's nothing more to show for one clock) |
| MotivationWidget | *(no Small tier — agreed exception)* | Today's tuned 210px | Proportionally larger, quote legibility preserved |

Each widget component gets its own `SIZE_LAYOUTS` map (or equivalent per-size render branch) rather than one layout scaled via CSS transform — a real Small widget shows *less content*, not a shrunk version of the Medium content, matching how real WidgetKit widgets work.

## Motion spec

Reuses `docs/design-system/motion.md`'s existing preset vocabulary; only one genuinely new preset is added.

- **Jiggle:** `rotate: [-1.5, 1.5, -1.5]` loop per widget; each of the 5 widgets gets an independently-assigned cycle duration in the 0.13s–0.19s band, so they drift in and out of phase — the real reason iOS jiggle doesn't look robotic, achieved without randomized-delay hacks.
- **Reposition drag:** `dragMomentum: false`, direct 1:1 pointer-follow. This intentionally diverges from `motion.md`'s existing momentum-based drag rule, which is scoped specifically to the project-card strip, not a blanket rule for every draggable element — real macOS widget dragging has no inertial fling.
- **New preset — `widgetSnap: { type: "spring", stiffness: 400, damping: 32 }`:** the drop-settle after a reposition or resize release. Close to the existing `tapPress` (400/17) but more damped — a widget locking into a grid position should feel firm and precise, not bouncy.
- **Resize handle:** live 1:1 dimension tracking while dragging (no spring lag mid-drag); `widgetSnap` only fires on release, to the nearest tier's exact target dimensions.
- **Exit jiggle:** reuses the existing `tapPress` preset (400/17) for a near-instant settle back to `rotate: 0`.
- **Reduced motion:** per the already-documented site-wide rule, `prefers-reduced-motion: reduce` disables jiggle oscillation and both springs entirely — position/size changes apply instantly, no bounce.

## Error handling & edge cases

- **localStorage unavailable** (private browsing, storage quota, disabled): try/catch around all read/write; falls back to in-memory-only (session works, doesn't persist). Never throws, never blocks rendering.
- **Corrupted/invalid saved JSON:** parse failure or a value missing a required field for any widget id falls back to that widget's *default* entry individually — one corrupted entry doesn't blank the whole layout.
- **Viewport shrink after save** (e.g. resizing the browser window, or loading on a smaller device than last time): every loaded position is clamped into the current viewport + exclusion zones on load, same safety net `WindowManagerContext` already has for its own resize handler.
- **Widget list changes in the future** (a 6th widget added later): any widget id with no matching localStorage entry falls back to its own default position — doesn't require a full layout reset.

## Testing

- `tsc --noEmit` + `npm run build` after implementation (this project's existing verification standard — no test runner is configured).
- Manual verification per widget: enter/exit jiggle mode, drag to reposition (grid-snap + guides visible), drag corner handle through all size tiers, reload the page and confirm the layout persisted, Reset Layout returns to default, and confirm `prefers-reduced-motion` removes jiggle/spring bounce.
