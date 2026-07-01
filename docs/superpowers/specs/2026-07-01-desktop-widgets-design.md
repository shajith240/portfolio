# Desktop widgets: Now Playing + Currently Building

## Context

The desktop currently renders two widgets in a left-hand column on the home screen: `PhotoWidget` (a square photo) and `AboutWidget` (tagline + bio, stacked directly below it). Both are rendered as siblings in `AppShell.tsx`, gated on `isHome`. This adds two more widgets to that column and fixes a positioning problem the existing pair already has, before it gets worse.

## Widget stack refactor

**Problem:** `PhotoWidget` and `AboutWidget` each independently compute their own `position: fixed; top: ...px` via hardcoded pixel math. `AboutWidget` redeclares a `PHOTO_WIDGET_HEIGHT = 260` constant to know where `PhotoWidget` ends — a magic number copy, not an import, so it can silently drift out of sync if `PhotoWidget`'s height ever changes. `AboutWidget`'s own height is content-driven (not fixed), so a third widget stacking below it has nothing reliable to measure against.

**Fix:** Introduce `components/widgets/DesktopWidgetStack.tsx` — a single `position: fixed` flex column (`display: flex; flexDirection: column; gap: 14px`) positioned once at `top: metrics.inset + 40, left: metrics.inset`. All four widgets render inside it as normal flow children with `position: static` (no more per-widget `top`/`left`/fixed positioning, no cross-file height constants). `AppShell.tsx`'s home-only block becomes:

```tsx
{isHome && (
  <DesktopWidgetStack>
    <PhotoWidget />
    <AboutWidget />
    <NowPlayingWidget />
    <CurrentlyBuildingWidget />
  </DesktopWidgetStack>
)}
```

`PhotoWidget`/`AboutWidget` lose their `position: fixed`/`top`/`left` styles and the `PHOTO_WIDGET_HEIGHT` constant; everything else about them (sizing, glass material, hover behavior) is unchanged. Each widget keeps `WIDGET_WIDTH = 260`.

## NowPlayingWidget

**File:** `components/widgets/NowPlayingWidget.tsx`

**Data:** `data/nowPlaying.ts` exports one object:
```ts
export const NOW_PLAYING = {
  title: "Untitled Track",
  artist: "Shajith Bathina",
  src: "/audio/now-playing.mp3",
  artwork: null as string | null, // no file yet — render a flat gradient instead of <img>
};
```
This file is a placeholder by design (per user decision) — swappable later without touching the component.

**Collapsed (rest) state**, height ~76px:
- Left: 52×52 squircle (`borderRadius: 22%`, matching `AppIcon`'s treatment on the Skills page) — `artwork` image if present, else a flat orange→dark gradient placeholder with a music-note glyph.
- Right: title (14px, weight 600) / artist (12px, `var(--text-muted)`), stacked, truncated to one line each.
- Far right: a round play/pause button (28px), icon-only, toggles a real `<audio>` element's `.play()`/`.pause()`.

**Hover-expanded state** (Framer `layout` animation, height grows to ~132px):
- Adds a horizontal scrubber below the title/artist: a thin track + filled portion driven by `audio.currentTime / audio.duration`, updated via the `timeupdate` event (not a rAF poll — the audio element already fires this at a reasonable cadence). Before metadata loads, `audio.duration` is `NaN`, which would otherwise divide out to a `NaN%` width — the fill percentage is guarded to `0` until a `loadedmetadata` event has actually fired.
- Adds prev/next glyphs either side of the play/pause button. With only one placeholder track, both are rendered disabled (`opacity: 0.35`, `pointer-events: none`) rather than wired to fake behavior — no dead click handlers pretending to do something.

**Playback correctness:**
- `<audio>` element is created via a ref, `preload="none"` (don't fetch audio on every page load before the user interacts).
- Play/pause button reflects real `<audio>` state via the element's own `play`/`pause`/`ended` events (not a client-guessed boolean) — clicking play calls `.play()`, which returns a promise; a caught rejection (autoplay-policy block or missing file) just leaves the button in the paused state rather than throwing.
- On `ended`, resets to paused + `currentTime = 0` (no loop, since there's one track).

## CurrentlyBuildingWidget

**File:** `components/widgets/CurrentlyBuildingWidget.tsx`
**Data:** `data/updates.ts`:
```ts
export interface Update {
  title: string
  blurb: string
  date: string // ISO 'YYYY-MM-DD'
}

export const UPDATES: Update[] = [
  {
    title: "macOS Desktop Rebuild",
    blurb: "Rebuilding this whole site as a Liquid Glass macOS desktop — real windows, a working Finder, genie-effect minimize, the works.",
    date: "2026-07-01",
  },
]
```
The widget always renders `UPDATES[0]` (newest-first array; no in-widget scrolling/pagination). Updating the site's status later means adding a new entry at the top of this array — same maintenance pattern as `data/projects.ts`/`data/skills.ts`.

**Collapsed state**, height ~72px:
- Left: 44×44 squircle icon (a simple hammer/wrench-style inline SVG glyph, no external icon file needed — this isn't a real app so it doesn't need a `/icons/*.png`).
- Right: title (13px, weight 600) + blurb truncated to a single line via `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`.

**Hover-expanded state** (same `layout` animation/spring as NowPlayingWidget, height grows to fit):
- Full blurb, wrapped (`white-space: normal`).
- A small formatted date line below it (e.g. "Jul 1, 2026"), `10px`, `var(--text-ghost)`. Formatted with an explicit locale/options (`toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })`), not a bare `toLocaleDateString()` — an unpinned locale can render differently between Next.js's server render and the browser's locale, which is a hydration mismatch, not just a cosmetic risk.

## Shared motion spec

Both widgets' hover-expand uses Framer Motion's `layout` prop on their outer container (auto-animates the height delta) with the project's documented `entrance` spring preset from `docs/design-system/motion.md`: `{ type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 }` — the same preset already used for panel/sheet-style size changes elsewhere (e.g. the Skills/Projects content container). This is a deliberate reuse, not a new one-off spring tuned per-component.

Both widgets share `PhotoWidget`/`AboutWidget`'s existing Liquid Glass card styling exactly: `WIDGET_WIDTH = 260`, `border-radius: 20px`, `background: var(--glass-regular-bg)`, `border: 1px solid var(--glass-border)`, `backdropFilter: blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))`, same box-shadow. No new material tier introduced.

## Explicitly out of scope

- No Spotify API/OAuth integration — static placeholder track only.
- No multi-track playlist, shuffle, or queue.
- No automatic changelog generation from git log — manually maintained data file only.
- No scrolling/paginated history in CurrentlyBuildingWidget — latest entry only.
- Mobile layout is untouched — these widgets render only in the `!isPhone` branch of `AppShell.tsx`, same gate as the existing two.
