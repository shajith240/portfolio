# Desktop Widgets (Now Playing + Currently Building) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new macOS-style desktop widgets (Now Playing, Currently Building) to the home screen's widget column, and fix the existing pair's fragile hardcoded-offset positioning as a prerequisite.

**Architecture:** One new `DesktopWidgetStack` flex-column container replaces per-widget `position: fixed` pixel math; `PhotoWidget`/`AboutWidget` become normal-flow children of it. Two new widgets follow the same pattern, each backed by a small manually-maintained data file (`data/nowPlaying.ts`, `data/updates.ts`) — no APIs, no auto-generation.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Framer Motion 12, existing Liquid Glass CSS custom properties (`styles/globals-tokens.css`).

## Global Constraints

- No component libraries — Tailwind utility classes aren't used for these widgets either (the existing widgets use inline `style` objects with CSS custom properties; match that, not Tailwind classes).
- Framer Motion only for animation, no CSS keyframes except simple color/opacity transitions (per `CLAUDE.md`).
- Hover-expand spring is exactly `{ type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 }` (the documented `entrance` preset in `docs/design-system/motion.md`) — do not invent a new stiffness/damping pair.
- Widget card styling is exactly: `width: 260px`, `border-radius: 20px`, `background: var(--glass-regular-bg)`, `border: 1px solid var(--glass-border)`, `backdropFilter: blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))`, `boxShadow: "0 16px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)"`.
- `data/*.ts` files in this repo use single quotes and no semicolons (see `data/projects.ts`, `data/skills.ts`) — match that style exactly in the two new data files. `components/**/*.tsx` files use double quotes and semicolons (see `components/widgets/AboutWidget.tsx`) — match that style in all component files.
- No invented content: the Currently Building seed entry and the Now Playing placeholder fields must match exactly what's specified below, not paraphrased.
- No test runner exists in this repo (no jest/vitest configured) — verification is `npx tsc --noEmit` (must be clean) plus `npm run build` at the end of the plan, not a new test framework. Do not add one.
- Do not use the preview/browser tools to verify visually — the user has said they'll check the running dev server manually. Verification in this plan is limited to typecheck/build and reading the rendered JSX/logic back.

---

## File Structure

- `components/widgets/DesktopWidgetStack.tsx` — **new**. Single fixed-position flex column; renders `children` in normal flow.
- `components/widgets/PhotoWidget.tsx` — **modify**. Remove `position: fixed`, `top`, `left`, `zIndex` (the stack now owns positioning/z-index).
- `components/widgets/AboutWidget.tsx` — **modify**. Same removal, plus delete the `PHOTO_WIDGET_HEIGHT`/`WIDGET_GAP` top-offset math entirely.
- `data/nowPlaying.ts` — **new**. `NOW_PLAYING` placeholder track object.
- `data/updates.ts` — **new**. `Update` interface + `UPDATES` array (one seed entry).
- `components/widgets/NowPlayingWidget.tsx` — **new**. Collapsed/hover-expanded card with real `<audio>` playback.
- `components/widgets/CurrentlyBuildingWidget.tsx` — **new**. Collapsed/hover-expanded card reading `UPDATES[0]`.
- `components/layout/AppShell.tsx` — **modify**. Swap the two-widget block for `<DesktopWidgetStack>` wrapping all four.

---

### Task 1: DesktopWidgetStack + migrate PhotoWidget/AboutWidget

**Files:**
- Create: `components/widgets/DesktopWidgetStack.tsx`
- Modify: `components/widgets/PhotoWidget.tsx`
- Modify: `components/widgets/AboutWidget.tsx`
- Modify: `components/layout/AppShell.tsx:73-80`

**Interfaces:**
- Produces: `DesktopWidgetStack({ children }: { children: React.ReactNode })` — a `position: fixed` flex column at `top: metrics.inset + 40px, left: metrics.inset px`, `display: flex; flexDirection: column; gap: 14px`, `zIndex: 20`. Later tasks' widgets are rendered as its children and must NOT set their own `position`/`top`/`left`/`zIndex`.

- [ ] **Step 1: Create `DesktopWidgetStack`**

```tsx
"use client";

import { useShellMetrics } from "@/lib/useShellMetrics";

/* Single positioning owner for the home-screen widget column. Replaces
   each widget computing its own `position: fixed; top: ...px` via
   hardcoded pixel math (the old AboutWidget redeclared a
   PHOTO_WIDGET_HEIGHT constant just to know where PhotoWidget ended —
   a copy, not an import, that could silently drift). Widgets rendered
   inside this are normal flow children; the gap and stacking order
   come from flexbox, not per-widget math. */

export default function DesktopWidgetStack({ children }: { children: React.ReactNode }) {
  const metrics = useShellMetrics();

  return (
    <div
      style={{
        position: "fixed",
        top: `${metrics.inset + 40}px`,
        left: `${metrics.inset}px`,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Strip positioning from `PhotoWidget`**

In `components/widgets/PhotoWidget.tsx`, the current style block is:

```tsx
      style={{
        position: "fixed",
        top: `${metrics.inset + 40}px`,
        left: `${metrics.inset}px`,
        zIndex: 20,
        width: `${WIDGET_WIDTH}px`,
        height: `${WIDGET_WIDTH}px`,
        borderRadius: "20px",
        overflow: "hidden",
        boxShadow: hovered
          ? "0 20px 44px rgba(0, 0, 0, 0.45)"
          : "0 16px 36px rgba(0, 0, 0, 0.38)",
        transition: "box-shadow 0.22s ease",
      }}
```

Replace it with:

```tsx
      style={{
        width: `${WIDGET_WIDTH}px`,
        height: `${WIDGET_WIDTH}px`,
        borderRadius: "20px",
        overflow: "hidden",
        boxShadow: hovered
          ? "0 20px 44px rgba(0, 0, 0, 0.45)"
          : "0 16px 36px rgba(0, 0, 0, 0.38)",
        transition: "box-shadow 0.22s ease",
      }}
```

The `metrics` variable is now unused in this file — remove the `const metrics = useShellMetrics();` line and the `import { useShellMetrics } from "@/lib/useShellMetrics";` line too, since nothing else in the file references either.

- [ ] **Step 3: Strip positioning from `AboutWidget`**

In `components/widgets/AboutWidget.tsx`, delete these two constants:

```tsx
const PHOTO_WIDGET_HEIGHT = 260;
const WIDGET_GAP = 14;
```

(`WIDGET_WIDTH` stays — it's still used for the card's own width.)

Change the style block from:

```tsx
      style={{
        position: "fixed",
        top: `${metrics.inset + 40 + PHOTO_WIDGET_HEIGHT + WIDGET_GAP}px`,
        left: `${metrics.inset}px`,
        zIndex: 20,
        width: `${WIDGET_WIDTH}px`,
        padding: "16px",
```

to:

```tsx
      style={{
        width: `${WIDGET_WIDTH}px`,
        padding: "16px",
```

Same as `PhotoWidget`: remove the now-unused `const metrics = useShellMetrics();` and its import line.

- [ ] **Step 4: Wire `DesktopWidgetStack` into `AppShell.tsx`**

In `components/layout/AppShell.tsx`, the current block (lines ~73-80) is:

```tsx
          <MenuBar />
          {isHome && (
            <>
              <PhotoWidget />
              <AboutWidget />
            </>
          )}
```

Replace with:

```tsx
          <MenuBar />
          {isHome && (
            <DesktopWidgetStack>
              <PhotoWidget />
              <AboutWidget />
            </DesktopWidgetStack>
          )}
```

Add the import near the other widget imports at the top of the file:

```tsx
import DesktopWidgetStack from "@/components/widgets/DesktopWidgetStack";
```

- [ ] **Step 5: Typecheck and visually confirm nothing moved**

Run: `npx tsc --noEmit`
Expected: no output (clean).

Read back `PhotoWidget.tsx` and `AboutWidget.tsx` in full after editing — confirm neither file references `metrics`, `PHOTO_WIDGET_HEIGHT`, or `WIDGET_GAP` anywhere anymore (an unused import or unused local would be a lint/build-quality regression, not just dead code).

- [ ] **Step 6: Commit**

```bash
git add components/widgets/DesktopWidgetStack.tsx components/widgets/PhotoWidget.tsx components/widgets/AboutWidget.tsx components/layout/AppShell.tsx
git commit -m "Introduce DesktopWidgetStack, replacing per-widget fixed-position math

PhotoWidget and AboutWidget each hardcoded their own position: fixed
top offset; AboutWidget redeclared a PHOTO_WIDGET_HEIGHT constant
(a copy, not an import) just to know where PhotoWidget ended. A third
widget stacking below AboutWidget had nothing reliable to measure
against, since AboutWidget's own height is content-driven. One shared
flex-column container now owns positioning for the whole widget
column; widgets are normal flow children."
```

---

### Task 2: Data files

**Files:**
- Create: `data/nowPlaying.ts`
- Create: `data/updates.ts`

**Interfaces:**
- Produces: `NOW_PLAYING: { title: string; artist: string; src: string; artwork: string | null }` from `data/nowPlaying.ts`.
- Produces: `interface Update { title: string; blurb: string; date: string }` and `UPDATES: Update[]` from `data/updates.ts`.

- [ ] **Step 1: Create `data/nowPlaying.ts`**

```ts
export interface NowPlayingTrack {
  title: string
  artist: string
  src: string
  artwork: string | null
}

// Placeholder track — no audio file exists yet. Swap `src`/`artwork` in
// once a real file is dropped into public/audio/; nothing in
// NowPlayingWidget.tsx needs to change to pick up the swap.
export const NOW_PLAYING: NowPlayingTrack = {
  title: 'Untitled Track',
  artist: 'Shajith Bathina',
  src: '/audio/now-playing.mp3',
  artwork: null,
}
```

- [ ] **Step 2: Create `data/updates.ts`**

```ts
export interface Update {
  title: string
  blurb: string
  date: string // ISO 'YYYY-MM-DD'
}

// Newest first. CurrentlyBuildingWidget always renders UPDATES[0] —
// add a new entry at the top when something changes, same maintenance
// pattern as data/projects.ts.
export const UPDATES: Update[] = [
  {
    title: 'macOS Desktop Rebuild',
    blurb: 'Rebuilding this whole site as a Liquid Glass macOS desktop — real windows, a working Finder, genie-effect minimize, the works.',
    date: '2026-07-01',
  },
]
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 4: Commit**

```bash
git add data/nowPlaying.ts data/updates.ts
git commit -m "Add data sources for Now Playing and Currently Building widgets

Both are manually-maintained, matching data/projects.ts's pattern —
no API calls, no auto-generation. NOW_PLAYING is an explicit
placeholder (no audio file exists yet); UPDATES is seeded with one
real entry about this portfolio rebuild."
```

---

### Task 3: NowPlayingWidget

**Files:**
- Create: `components/widgets/NowPlayingWidget.tsx`

**Interfaces:**
- Consumes: `NOW_PLAYING` from `data/nowPlaying.ts` (Task 2).
- Produces: `NowPlayingWidget()` — a default-exported React component with no props, rendered as a `DesktopWidgetStack` child (Task 1's contract: no self-positioning).

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { NOW_PLAYING } from "@/data/nowPlaying";

/* macOS "Now Playing" widget — real <audio> playback (no Spotify
   OAuth/infra), collapsed by default, hover-expands to a scrubber +
   prev/next glyphs via Framer's `layout` prop. Spring/card styling
   match docs/design-system/motion.md's `entrance` preset and the
   existing PhotoWidget/AboutWidget Liquid Glass card exactly — see
   docs/superpowers/specs/2026-07-01-desktop-widgets-design.md. */

const WIDGET_WIDTH = 260;
const ENTRANCE_SPRING = { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 } as const;

function MusicNoteGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M9 18V5l10-2v11" stroke="rgba(255,255,255,0.85)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6.5" cy="18" r="2.5" fill="rgba(255,255,255,0.85)" />
      <circle cx="16.5" cy="16" r="2.5" fill="rgba(255,255,255,0.85)" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3.5 2.5L13 8L3.5 13.5V2.5Z" fill="var(--text-primary)" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="3.5" y="2.5" width="3" height="11" rx="1" fill="var(--text-primary)" />
      <rect x="9.5" y="2.5" width="3" height="11" rx="1" fill="var(--text-primary)" />
    </svg>
  );
}

function SkipGlyph({ direction }: { direction: "prev" | "next" }) {
  const flip = direction === "prev" ? "scale(-1, 1)" : undefined;
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ transform: flip }}>
      <path d="M3 2.5L10 8L3 13.5V2.5Z" fill="var(--text-muted)" />
      <rect x="11" y="2.5" width="2" height="11" fill="var(--text-muted)" />
    </svg>
  );
}

export default function NowPlayingWidget() {
  const [hovered, setHovered] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => {
        // Autoplay-policy block or missing file at NOW_PLAYING.src —
        // stay paused rather than throwing an unhandled rejection.
      });
    }
  };

  return (
    <motion.div
      layout
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={ENTRANCE_SPRING}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: `${WIDGET_WIDTH}px`,
        padding: "14px",
        borderRadius: "20px",
        background: "var(--glass-regular-bg)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
        WebkitBackdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
        boxShadow: "0 16px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        overflow: "hidden",
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
        onTimeUpdate={(e) => {
          const audio = e.currentTarget;
          // duration is NaN until loadedmetadata fires — guard to 0
          // rather than letting a NaN% width leak into the scrubber.
          const pct = Number.isFinite(audio.duration) && audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0;
          setProgress(pct);
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "52px",
            height: "52px",
            flexShrink: 0,
            borderRadius: "22%",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: NOW_PLAYING.artwork ? undefined : "linear-gradient(160deg, #FF7A45 0%, #7A1F00 100%)",
          }}
        >
          {NOW_PLAYING.artwork ? (
            <img
              src={NOW_PLAYING.artwork}
              alt={NOW_PLAYING.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <MusicNoteGlyph />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {NOW_PLAYING.title}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {NOW_PLAYING.artist}
          </p>
        </div>

        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          style={{
            width: "28px",
            height: "28px",
            flexShrink: 0,
            borderRadius: "50%",
            border: "none",
            background: "rgba(255, 255, 255, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {playing ? <PauseGlyph /> : <PlayGlyph />}
        </button>
      </div>

      {hovered && (
        <div style={{ marginTop: "12px" }}>
          <div
            style={{
              height: "3px",
              borderRadius: "2px",
              background: "rgba(255, 255, 255, 0.14)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "#FF4500",
                borderRadius: "2px",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "18px", marginTop: "10px" }}>
            <span style={{ opacity: 0.35, pointerEvents: "none", display: "flex" }}>
              <SkipGlyph direction="prev" />
            </span>
            <span style={{ opacity: 0.35, pointerEvents: "none", display: "flex" }}>
              <SkipGlyph direction="next" />
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 3: Confirm the NaN-guard and rejection-catch by reading the code back**

Re-open `components/widgets/NowPlayingWidget.tsx` and confirm two things textually (this substitutes for a test runner, which this repo doesn't have):
1. `onTimeUpdate` computes `pct` only when `Number.isFinite(audio.duration) && audio.duration > 0`, else `0` — never divides by a `NaN`/`0` duration.
2. `togglePlay`'s `audio.play()` call has a `.catch(() => { ... })` — a rejected play promise (missing `/audio/now-playing.mp3` file, or an autoplay-policy block) cannot become an unhandled promise rejection.

- [ ] **Step 4: Commit**

```bash
git add components/widgets/NowPlayingWidget.tsx
git commit -m "Add NowPlayingWidget with real <audio> playback

Collapsed state shows artwork/title/artist/play-pause; hovering
expands (Framer layout animation, entrance spring) to reveal a
scrubber and disabled prev/next glyphs — disabled rather than wired to
fake behavior, since there's only one placeholder track. Play button
reflects the audio element's own play/pause/ended events, not a
client-guessed boolean; a rejected play() (missing file or
autoplay-policy block) is caught rather than left as an unhandled
rejection."
```

---

### Task 4: CurrentlyBuildingWidget

**Files:**
- Create: `components/widgets/CurrentlyBuildingWidget.tsx`

**Interfaces:**
- Consumes: `UPDATES` from `data/updates.ts` (Task 2).
- Produces: `CurrentlyBuildingWidget()` — a default-exported React component with no props, rendered as a `DesktopWidgetStack` child.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UPDATES } from "@/data/updates";

/* macOS "Stickies"-style widget for the site's own changelog. Reads
   UPDATES[0] only (newest-first array, manually maintained) — no
   in-widget history/pagination. See
   docs/superpowers/specs/2026-07-01-desktop-widgets-design.md. */

const WIDGET_WIDTH = 260;
const ENTRANCE_SPRING = { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 } as const;

function HammerGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M14.5 6.5L18 3L21 6L17.5 9.5" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2.5" y="14" width="14" height="5" rx="1.2" transform="rotate(-45 2.5 14)" fill="rgba(255,255,255,0.9)" />
      <path d="M13 8L16.5 11.5" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function formatUpdateDate(iso: string): string {
  // Explicit locale + options, not a bare toLocaleDateString() — an
  // unpinned locale can render differently between Next.js's server
  // render and the browser, which is a hydration mismatch, not just
  // a cosmetic risk.
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function CurrentlyBuildingWidget() {
  const [hovered, setHovered] = useState(false);
  const latest = UPDATES[0];

  return (
    <motion.div
      layout
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={ENTRANCE_SPRING}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: `${WIDGET_WIDTH}px`,
        padding: "14px",
        borderRadius: "20px",
        background: "var(--glass-regular-bg)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
        WebkitBackdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
        boxShadow: "0 16px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <div
          style={{
            width: "44px",
            height: "44px",
            flexShrink: 0,
            borderRadius: "22%",
            background: "linear-gradient(160deg, #FF7A45 0%, #7A1F00 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <HammerGlyph />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: "0 0 3px 0", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
            {latest.title}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              color: "var(--text-muted)",
              lineHeight: 1.4,
              whiteSpace: hovered ? "normal" : "nowrap",
              overflow: "hidden",
              textOverflow: hovered ? "clip" : "ellipsis",
            }}
          >
            {latest.blurb}
          </p>
          {hovered && (
            <p style={{ margin: "6px 0 0 0", fontSize: "10px", color: "var(--text-ghost)" }}>
              {formatUpdateDate(latest.date)}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 3: Confirm the date-formatting fix by reading the code back**

Re-open `components/widgets/CurrentlyBuildingWidget.tsx` and confirm `formatUpdateDate` passes `"en-US"` and an explicit `options` object to `toLocaleDateString` — not a bare `new Date(iso).toLocaleDateString()`.

- [ ] **Step 4: Commit**

```bash
git add components/widgets/CurrentlyBuildingWidget.tsx
git commit -m "Add CurrentlyBuildingWidget reading data/updates.ts

Collapsed state truncates the blurb to one line; hovering expands
(same layout animation/spring as NowPlayingWidget) to the full blurb
plus a locale-pinned formatted date, avoiding a bare toLocaleDateString()
hydration mismatch between server and client."
```

---

### Task 5: Wire both widgets into the desktop and final verification

**Files:**
- Modify: `components/layout/AppShell.tsx`

**Interfaces:**
- Consumes: `DesktopWidgetStack` (Task 1), `NowPlayingWidget` (Task 3), `CurrentlyBuildingWidget` (Task 4).

- [ ] **Step 1: Add the two new widgets to the stack**

In `components/layout/AppShell.tsx`, change:

```tsx
          {isHome && (
            <DesktopWidgetStack>
              <PhotoWidget />
              <AboutWidget />
            </DesktopWidgetStack>
          )}
```

to:

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

Add the two imports near the other widget imports:

```tsx
import NowPlayingWidget from "@/components/widgets/NowPlayingWidget";
import CurrentlyBuildingWidget from "@/components/widgets/CurrentlyBuildingWidget";
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 3: Full production build**

Run: `npm run build`
Expected: `✓ Compiled successfully`, followed by the static-page generation summary, no errors. This is the final correctness gate for this plan — Next.js's build step catches issues (e.g. server/client mismatches surfaced during static generation) that `tsc` alone doesn't.

- [ ] **Step 4: Commit**

```bash
git add components/layout/AppShell.tsx
git commit -m "Add Now Playing and Currently Building widgets to the desktop

Completes the four-widget column: Photo, About, Now Playing,
Currently Building — stacked via DesktopWidgetStack from the earlier
task in this plan."
```

- [ ] **Step 5: Hand off for manual visual check**

Do not use the preview/browser tools here. Tell the user the dev server (`npm run dev`) is ready to check manually: the widget column should show all four cards stacked with a 14px gap, Now Playing's play button should toggle (silently failing to actually produce sound until a real file is dropped at `public/audio/now-playing.mp3`, per this plan's placeholder-audio design), and hovering either of the two new widgets should smoothly expand them in place.

---

## Self-Review Notes

- **Spec coverage:** DesktopWidgetStack refactor → Task 1. NowPlayingWidget (collapsed/expanded states, audio correctness, NaN-guard, rejection-catch) → Task 3. CurrentlyBuildingWidget (collapsed/expanded states, data file, locale-pinned date) → Task 2 + Task 4. Shared motion/card styling → baked into Tasks 3-4 directly (`ENTRANCE_SPRING` constant, identical style block). Out-of-scope items (Spotify API, playlist, git-log changelog, pagination, mobile) are simply absent from every task — nothing to do for them.
- **Placeholder scan:** no TBD/TODO markers; `NOW_PLAYING`'s placeholder values are the deliverable, not a gap.
- **Type consistency:** `NowPlayingTrack`/`NOW_PLAYING` (Task 2) match the shape consumed in `NowPlayingWidget.tsx` (Task 3) field-for-field. `Update`/`UPDATES` (Task 2) match `CurrentlyBuildingWidget.tsx`'s `UPDATES[0]` access (Task 4) field-for-field. `DesktopWidgetStack`'s `children: React.ReactNode` prop (Task 1) matches how it's called in Task 5 (four widget children, no props passed to the wrapper besides children).
