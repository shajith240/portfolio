# Apple / Liquid Glass Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the components being replaced (RightNav, the sound-effect system) and produce a topic-split Apple/Liquid Glass design-system reference that `CLAUDE.md`/`AGENTS.md` point to, so all future component work (starting with the user's own Dock component) has a grounded, exact spec to build against.

**Architecture:** Two independent tracks. Track A is mechanical removal (delete files, strip now-dead imports/calls, trim context state) verified by `next build` + grep. Track B is documentation authoring (`docs/design-system/*.md`) grounded in real Apple HIG / WWDC 2025 Liquid Glass sourcing, verified by internal-consistency read-through since there's no test framework in this repo (Next.js app, no jest/vitest/playwright configured — `puppeteer` devDependency is only used by the ad hoc `screenshot.mjs`).

**Tech Stack:** Next.js 16 (App Router), TypeScript, React 19, Framer Motion 12, Tailwind CSS v4. No test runner — verification is `next build` (TypeScript compiles, no dangling imports) plus targeted `grep`.

## Global Constraints

- No component libraries (shadcn, MUI, Chakra, etc.) — spec carryover, still true
- Framer Motion for all animation — spec carryover, still true
- This is a portfolio *inspired by* Apple, not a literal system app — every design-doc claim must be flagged as "direct HIG source" or "web adaptation"
- `CLAUDE.md` must stay short — it loads into every message; detail lives in `docs/design-system/*.md`, read on demand
- Nothing in Track A may touch `LeftSidebar.tsx`'s own rendering logic beyond removing the two sound call sites — visual/behavioral changes to the sidebar are out of scope for this plan
- Desktop having zero nav UI after Task 2 is accepted/confirmed by the user (Dock comes in a follow-up session)

---

### Task 1: Remove the sound-effect system

**Files:**
- Delete: `lib/useClickSound.ts`
- Delete: `lib/useHoverSound.ts`
- Delete: `public/sounds/click.wav`
- Delete: `public/sounds/sidebar_sound.mp3`
- Modify: `components/layout/LeftSidebar.tsx:8` (import), `:119,122` (hook call), `:149` (call site)
- Modify: `components/ui/BottomToolbar.tsx:8` (import), `:69` (hook call), `:152,174` (call sites)
- Modify: `components/ui/CommandPalette.tsx:8` (import), `:179-191` (prop/callback), `:331-332` (hook call), `:628` (call site)

**Interfaces:**
- Produces: no code depends on `useClickSound`/`useHoverSound` after this task — confirmed by repo-wide grep in the verify step
- Consumes: nothing from other tasks

- [ ] **Step 1: Delete the sound hook files and audio assets**

```bash
git rm lib/useClickSound.ts lib/useHoverSound.ts public/sounds/click.wav public/sounds/sidebar_sound.mp3
```

- [ ] **Step 2: Strip sound usage from `LeftSidebar.tsx`**

Remove the import (currently line 8):

```tsx
import { useClickSound } from "@/lib/useClickSound";
```

Change (currently lines 118-122):

```tsx
export default function LeftSidebar() {
  const { isSidebarOpen, toggleSidebar, isSoundEnabled, isMobileLayout } = useLayout();
  const metrics = useShellMetrics();
  const compactSocialCards = metrics.viewportHeight < 940;
  const playClick = useClickSound(isSoundEnabled);
```

to:

```tsx
export default function LeftSidebar() {
  const { isSidebarOpen, toggleSidebar, isMobileLayout } = useLayout();
  const metrics = useShellMetrics();
  const compactSocialCards = metrics.viewportHeight < 940;
```

Change the toggle button click handler (currently line 149):

```tsx
onClick={() => { playClick(); toggleSidebar(); }}
```

to:

```tsx
onClick={toggleSidebar}
```

- [ ] **Step 3: Strip sound usage from `BottomToolbar.tsx`**

Remove the import (currently line 8):

```tsx
import { useClickSound } from "@/lib/useClickSound";
```

Change (currently line 69, inside `export default function BottomToolbar()`):

```tsx
const playClick = useClickSound(isSoundEnabled);
```

Delete this line entirely (no replacement — `isSoundEnabled` stays destructured from `useLayout()` since the toggle button below still reads it).

Change the two theme-toggle click handlers (currently lines 152 and 174):

```tsx
onClick={() => { playClick(); if (isDarkTheme) toggleTheme(); }}
```

```tsx
onClick={() => { playClick(); if (!isDarkTheme) toggleTheme(); }}
```

to:

```tsx
onClick={() => { if (isDarkTheme) toggleTheme(); }}
```

```tsx
onClick={() => { if (!isDarkTheme) toggleTheme(); }}
```

The sound toggle button itself (the speaker icon button, currently lines 112-138) is untouched — it already only calls `toggleSound`, never `playClick`.

- [ ] **Step 4: Strip sound usage from `CommandPalette.tsx`**

Remove the import (currently line 8):

```tsx
import { useHoverSound } from "@/lib/useHoverSound";
```

`useCallback` (currently imported on line 3 alongside `useState, useEffect, useRef, useMemo`) is used in this file **only** by the `handleEnter` callback being removed below — `handleSelect` (line 409) is a plain function, not wrapped in `useCallback`. Confirmed via grep that there is no other call site. Change line 3:

```tsx
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
```

to:

```tsx
import { useState, useEffect, useRef, useMemo } from "react";
```

Change the `PaletteItem` function signature and body (currently lines 179-191):

```tsx
function PaletteItem({
  icon, label, hint, shortcut, active, onClick, onHover,
}: {
  icon: React.ReactNode; label: string; hint?: string; shortcut?: string;
  active: boolean; onClick: () => void; onHover: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const highlighted = hovered || active;

  const handleEnter = useCallback(() => {
    setHovered(true);
    onHover();
  }, [onHover]);
```

to:

```tsx
function PaletteItem({
  icon, label, hint, shortcut, active, onClick,
}: {
  icon: React.ReactNode; label: string; hint?: string; shortcut?: string;
  active: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const highlighted = hovered || active;
```

Change the button's mouse handler (currently line 197):

```tsx
onMouseEnter={handleEnter}
```

to:

```tsx
onMouseEnter={() => setHovered(true)}
```

Change the call site (currently lines 330-332):

```tsx
export default function CommandPalette() {
  const { isSearchOpen, openSearch, closeSearch, isSoundEnabled } = useLayout();
  const playHover = useHoverSound(isSoundEnabled);
```

to:

```tsx
export default function CommandPalette() {
  const { isSearchOpen, openSearch, closeSearch } = useLayout();
```

Change the `PaletteItem` invocation (currently line 628):

```tsx
                              onHover={playHover}
```

Delete this line entirely (the prop no longer exists on `PaletteItem`).

- [ ] **Step 5: Verify no dangling references**

Run:

```bash
grep -rn "useClickSound\|useHoverSound\|playClick\|playHover" --include="*.ts" --include="*.tsx" . | grep -v node_modules
```

Expected: no output.

- [ ] **Step 6: Verify the app still builds**

Run:

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors related to removed imports/props.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Remove sound-effect system, keep sound toggle as inert UI

Deletes useClickSound/useHoverSound and the two audio assets, strips
every playClick()/playHover() call site. The sound toggle button and
isSoundEnabled/toggleSound state in LayoutContext stay untouched for
potential future re-wiring.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Remove RightNav + MenuButton, trim LayoutContext, update AppShell

**Files:**
- Delete: `components/layout/RightNav.tsx`
- Delete: `components/ui/MenuButton.tsx`
- Modify: `components/layout/AppShell.tsx`
- Modify: `contexts/LayoutContext.tsx`

**Interfaces:**
- Consumes: nothing from Task 1
- Produces: `useLayout()` no longer exposes `isNavOpen`/`toggleNav` — any future Dock component (built in a later session) must define its own open/close state rather than assuming these exist

- [ ] **Step 1: Delete RightNav and MenuButton**

```bash
git rm components/layout/RightNav.tsx components/ui/MenuButton.tsx
```

- [ ] **Step 2: Update `AppShell.tsx`**

Replace the full file content with:

```tsx
"use client";

import { type ReactNode, useEffect } from "react";
import { LayoutProvider, useLayout } from "@/contexts/LayoutContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { usePerformance } from "@/lib/usePerformance";
import LeftSidebar from "@/components/layout/LeftSidebar";
import CommandPalette from "@/components/ui/CommandPalette";
import PageBreadcrumb from "@/components/ui/PageBreadcrumb";
import MobileTabBar from "@/components/ui/MobileTabBar";

function Shell({ children }: { children: ReactNode }) {
  const { isMobileLayout, isTabletLayout, isSidebarOpen, closeSidebars } = useLayout();
  const { tier } = usePerformance();

  // Set performance tier class on <html> for CSS-level optimizations
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("perf-full", "perf-reduced", "perf-minimal");
    html.classList.add(`perf-${tier}`);
  }, [tier]);
  const isPhone = isMobileLayout && !isTabletLayout;

  // Phone: completely different shell — bottom tab bar, no sidebars
  // Tablet: sidebar as overlay with backdrop
  // Desktop: full panel layout
  // Backdrop only for tablet (overlay sidebar) — never on phones (no sidebar exists)
  const showBackdrop = !isPhone && isMobileLayout && isSidebarOpen;

  return (
    <div
      className="h-screen overflow-hidden"
      style={{ color: "var(--text-primary)", background: "var(--bg-page)" }}
    >
      {/* Backdrop — closes panel when tapped (tablet + phone when sidebar forced open) */}
      {showBackdrop && (
        <div
          onClick={closeSidebars}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.55)",
            zIndex: 35,
          }}
        />
      )}

      {/* Phone layout: no sidebar — tab bar handles navigation */}
      {isPhone ? (
        <>
          <PageBreadcrumb />
          {children}
          <MobileTabBar />
          <CommandPalette />
        </>
      ) : (
        <>
          <PageBreadcrumb />
          <LeftSidebar />
          {children}
          <CommandPalette />
        </>
      )}
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LayoutProvider>
        <Shell>{children}</Shell>
      </LayoutProvider>
    </ThemeProvider>
  );
}
```

(This drops the `RightNav`/`MenuButton` imports and renders, and drops `isNavOpen`/`isSidebarOpen` from the backdrop condition down to just `isSidebarOpen` since `isNavOpen` no longer exists.)

- [ ] **Step 3: Trim `LayoutContext.tsx`**

Replace the full file content with:

```tsx
"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";

interface LayoutContextValue {
  isSidebarOpen: boolean;
  isSearchOpen: boolean;
  isSoundEnabled: boolean;
  isMobileLayout: boolean;
  isTabletLayout: boolean;
  viewportWidth: number;
  viewportHeight: number;
  toggleSidebar: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSound: () => void;
  closeSidebars: () => void;
}

const LayoutContext = createContext<LayoutContextValue>({
  isSidebarOpen: false,
  isSearchOpen: false,
  isSoundEnabled: true,
  isMobileLayout: false,
  isTabletLayout: false,
  viewportWidth: 1440,
  viewportHeight: 900,
  toggleSidebar: () => {},
  openSearch: () => {},
  closeSearch: () => {},
  toggleSound: () => {},
  closeSidebars: () => {},
});

export function LayoutProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  /*
    Sidebar is open by default only on the home route.
    This ensures SSR output matches client initial render on every page —
    eliminating the hydration mismatch on the sidebar transform attribute.
  */
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  // SSR-safe: default false (desktop) → updates after mount
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  // isTabletLayout: 640px–1023px (iPad-size range)
  const [isTabletLayout, setIsTabletLayout] = useState(false);
  const [viewport, setViewport] = useState({ width: 1440, height: 900 });

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setViewport({ width: w, height: h });
      setIsMobileLayout(w < 1024);
      setIsTabletLayout(w >= 640 && w < 1024);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  /*
    Route change handler — close the sidebar on any sub-page.
    On home, reopen the sidebar so navigating back feels natural.
  */
  useEffect(() => {
    if (isHome) {
      // Only auto-open sidebar on desktop/tablet — phones have no sidebar
      setIsSidebarOpen(!isMobileLayout || isTabletLayout);
    } else {
      setIsSidebarOpen(false);
    }
  }, [isHome, isMobileLayout, isTabletLayout]);

  const toggleSidebar = useCallback(() => setIsSidebarOpen((v) => !v), []);
  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);
  const toggleSound = useCallback(() => setIsSoundEnabled((v) => !v), []);
  const closeSidebars = useCallback(() => setIsSidebarOpen(false), []);

  return (
    <LayoutContext.Provider value={{
      isSidebarOpen, isSearchOpen, isSoundEnabled, isMobileLayout, isTabletLayout,
      viewportWidth: viewport.width, viewportHeight: viewport.height,
      toggleSidebar, openSearch, closeSearch, toggleSound, closeSidebars,
    }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
```

- [ ] **Step 4: Verify no dangling references**

Run:

```bash
grep -rn "RightNav\|MenuButton\|isNavOpen\|toggleNav" --include="*.ts" --include="*.tsx" . | grep -v node_modules
```

Expected: no output.

- [ ] **Step 5: Verify the app still builds**

Run:

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 6: Manual smoke check**

Run:

```bash
npm run dev
```

Open `http://localhost:3000` — confirm: no console errors, `LeftSidebar` renders, `BottomToolbar` renders (sound toggle button visible and clickable, theme toggle still works), no right-hand nav panel, no "Menu" button top-right. Stop the dev server after checking.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Remove RightNav and MenuButton, trim LayoutContext

Desktop navigation moves to a macOS-style Dock, built in a follow-up
session from the user's own component spec — desktop has no nav UI in
the interim, which is expected and confirmed. isNavOpen/toggleNav are
dropped from LayoutContext since nothing consumes them anymore.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Exclude the Big Sur asset folder from git

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add the ignore entry**

Append to `.gitignore`:

```
# Downloaded design-kit reference (Figma/Sketch source, not a web asset — 374MB, keep local only)
ndwimpgPQRiKqUcOz7t6_MacOS-11-Big-Sur/
```

- [ ] **Step 2: Verify it's ignored**

Run:

```bash
git status --short
```

Expected: the `ndwimpgPQRiKqUcOz7t6_MacOS-11-Big-Sur/` folder no longer appears (tracked or untracked) in the output.

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "$(cat <<'EOF'
Ignore downloaded Big Sur design-kit folder

374MB of .fig/.sketch source files — not consumable by the Next.js
build directly. Kept on disk for manual icon/asset reference, excluded
from version control.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Write `docs/design-system/materials-glass.md`

**Files:**
- Create: `docs/design-system/materials-glass.md`

- [ ] **Step 1: Create the directory and write the file**

```bash
mkdir -p docs/design-system
```

Write `docs/design-system/materials-glass.md`:

```markdown
# Materials & Liquid Glass

> Read this before touching any surface that floats above content: the dock, overlays, modals, toolbars, cards with hover elevation.

## What Liquid Glass is

**[HIG-sourced]** Liquid Glass is the material system Apple introduced at WWDC 2025 (announced June 9, 2025) across iOS 26, iPadOS 26, macOS 26 "Tahoe", tvOS 26, watchOS 26, and visionOS 26. It's described as a dynamic "digital meta-material" combining real-time blur, depth-based refraction, and specular highlights. Background content doesn't just blur under it — it *lenses*: bends and focuses through the glass the way light bends through real glass, with highlights that track device motion in real time.

This portfolio is *inspired by* this material, not a literal reimplementation of Apple's private rendering stack — every rule below is flagged **[HIG-sourced]** (a direct Apple guideline/behavior) or **[Web adaptation]** (our translation of the concept into CSS/SVG for a browser).

## Two material tiers

**[HIG-sourced]** Apple's system exposes two tiers:

- **Regular Glass** — more opaque, adapts its own tint to whatever's behind it to guarantee legibility. Use for controls that carry text or icons people must read: toolbars, sidebars, the dock, menus.
- **Clear Glass** — more transparent, minimal added tint. Use only over media-rich backgrounds (photos, video) where showing the content matters more than the control's own contrast, and only when the surrounding chrome already guarantees legibility another way.

**Default to Regular Glass everywhere on this site.** Clear Glass is the exception, not the default — most of this portfolio's backgrounds are flat dark/light, not photo content, so Clear Glass would just look under-contrasted.

## Concentricity

**[HIG-sourced]** Every glass element's corner radius must nest *concentrically* inside its parent container's radius — this is one of the defining visual signatures of the Tahoe design language (see the floating sidebar/toolbar treatment in macOS 26). The rule:

```
containerRadius = childRadius + childInsetFromContainerEdge
```

If a glass pill sits 8px inside a container with a 24px radius, the pill's own radius should be 16px (24 − 8), not an arbitrary value like 12px or "fully rounded." Mismatched radii are the single fastest way to make a glass UI look like generic glassmorphism instead of Apple's actual system.

## Material thickness scales with size

**[HIG-sourced]** When a glass element grows — e.g., a toolbar button expanding into a menu, or a compact control presenting a sheet — its material should behave like it got physically thicker: deeper/richer shadow, more pronounced lensing and refraction, softer light scatter. Practical rule for this codebase:

- **Thin glass** — small, persistent controls (dock icons, pill buttons like the drag-strip control). Subtle blur, minimal shadow.
- **Regular glass** — mid-size floating panels (the dock itself, toolbars).
- **Thick glass** — large, transient surfaces (modals, the command palette, full sheets). Strongest blur/shadow/refraction.

## Scroll edge effect

**[HIG-sourced]** Where edge-to-edge scrollable content passes underneath a floating glass element, Tahoe introduces a visual separation at that boundary — either a soft gradient fade or a harder opaque backing, chosen dynamically based on whether the fade alone gives enough contrast. Any floating glass element with scrollable content behind it (the dock over a scrolling page, a toolbar over long content) needs this: add a `mask-image: linear-gradient(...)` fade on the content's edge, or fall back to a harder-backed glass tier if contrast is still insufficient.

## Adaptive tint & legibility

**[HIG-sourced]** Glass must shift its own tint/shadow/contrast based on what's behind it — never let underlying content make foreground text illegible. Baseline tokens for this site:

- Dark theme: `rgba(28, 28, 30, 0.78)` background tint, `rgba(255, 255, 255, 0.10)` hairline border
- Light theme: `rgba(255, 255, 255, 0.78)` background tint, `rgba(0, 0, 0, 0.06)` hairline border

(These are the exact values already validated in this codebase's `MobileTabBar` dock — reuse them as the standard rather than inventing new ones per component.)

## Accessibility

**[HIG-sourced]**
- `prefers-reduced-transparency: reduce` → fall back to a solid `--bg-card` background, no blur, no refraction. Never skip this check.
- `prefers-reduced-motion: reduce` → disable any lensing/parallax that reacts to motion; keep a static frosted look.
- High-contrast mode → thicken hairline borders and raise backing opacity; never rely on blur alone for separation from content.

## Web implementation recipe

**[Web adaptation]** The web has no native Liquid Glass API. Two-tier fallback:

**Baseline tier (every browser):**

```css
backdrop-filter: blur(24px) saturate(180%);
-webkit-backdrop-filter: blur(24px) saturate(180%);
background: rgba(28, 28, 30, 0.78); /* dark theme */
border: 0.5px solid rgba(255, 255, 255, 0.10);
```

This is already correctly implemented in `MobileTabBar.tsx` — treat those exact values as the reference implementation, not just an example.

**Enhanced tier (Chromium only — Safari/Firefox don't support SVG filters as `backdrop-filter` input):**

Feature-detect with `@supports`, then layer an SVG `<feDisplacementMap>` filter on top of the baseline blur to add real edge refraction:

```css
@supports (backdrop-filter: url(#liquid-glass-refraction)) {
  .glass-hero {
    backdrop-filter: url(#liquid-glass-refraction) blur(20px) saturate(180%);
  }
}
```

```html
<svg style="position: absolute; width: 0; height: 0;">
  <filter id="liquid-glass-refraction">
    <feImage href="#glass-displacement-map" x="0%" y="0%" width="100%" height="100%" result="map" />
    <feDisplacementMap in="SourceGraphic" in2="map" scale="18" xChannelSelector="R" yChannelSelector="G" />
  </filter>
</svg>
```

**Only apply the enhanced tier to a handful of hero surfaces** (the dock, the command palette when open) — never to every card on screen. This matches Apple's own performance guidance: each glass instance reserves real GPU/compositing budget, and heavy SVG `feDisplacementMap` use causes visible jank on low-power devices. Everything else gets the baseline tier only.

## Token reference

| Token | Dark | Light |
|---|---|---|
| `--glass-thin-bg` | `rgba(28, 28, 30, 0.62)` | `rgba(255, 255, 255, 0.62)` |
| `--glass-regular-bg` | `rgba(28, 28, 30, 0.78)` | `rgba(255, 255, 255, 0.78)` |
| `--glass-thick-bg` | `rgba(20, 20, 22, 0.90)` | `rgba(255, 255, 255, 0.92)` |
| `--glass-border` | `rgba(255, 255, 255, 0.10)` | `rgba(0, 0, 0, 0.06)` |
| `--glass-blur-thin` | `16px` | `16px` |
| `--glass-blur-regular` | `24px` | `24px` |
| `--glass-blur-thick` | `40px` | `40px` |
| `--glass-saturate` | `180%` | `180%` |

## Sources

- [Materials — Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Liquid Glass — Apple Developer Documentation](https://developer.apple.com/documentation/technologyoverviews/liquid-glass)
- [Meet Liquid Glass — WWDC25](https://developer.apple.com/videos/play/wwdc2025/219/)
- [Build an AppKit app with the new design — WWDC25](https://developer.apple.com/videos/play/wwdc2025/310/)
- [Liquid Glass in the Browser: Refraction with CSS and SVG — kube.io](https://kube.io/blog/liquid-glass-css-svg/)
- [How to create Liquid Glass effects with CSS and SVG — LogRocket](https://blog.logrocket.com/how-create-liquid-glass-effects-css-and-svg/)
```

- [ ] **Step 2: Read it back and check internal consistency**

Confirm every numeric token in the "Token reference" table matches the values used in the prose above it (blur amounts, tint rgba values). Confirm every `[HIG-sourced]` claim is something you actually found in the research, not invented — if unsure, mark it `[Web adaptation]` instead.

- [ ] **Step 3: Commit**

```bash
git add docs/design-system/materials-glass.md
git commit -m "$(cat <<'EOF'
Add Liquid Glass materials reference doc

Grounds the glass/vibrancy system in real Apple HIG + WWDC 2025 Liquid
Glass sourcing: two material tiers, concentricity, scale-dependent
thickness, scroll edge effect, accessibility fallbacks, and a two-tier
CSS/SVG web implementation recipe with token values.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Write `docs/design-system/typography.md`

**Files:**
- Create: `docs/design-system/typography.md`

- [ ] **Step 1: Write the file**

```markdown
# Typography

> Read this before setting any font-size, weight, or letter-spacing value.

## Font stack

**[Web adaptation]** No SF Pro web license — rely on the system font stack, which resolves to real SF Pro on every Apple device and a close system equivalent elsewhere:

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif;
```

## Type scale

**[HIG-sourced]** Apple's Dynamic Type scale at the default ("Large") size:

| Style | Size | Line height | Typical weight |
|---|---|---|---|
| Large Title | 34pt | 41pt | Regular (Bold only for rare hero moments) |
| Title 1 | 28pt | 34pt | Regular |
| Title 2 | 22pt | 28pt | Regular |
| Title 3 | 20pt | 25pt | Regular |
| Headline | 17pt | 22pt | Semibold |
| Body | 17pt | 22pt | Regular |
| Callout | 16pt | 21pt | Regular |
| Subhead | 15pt | 20pt | Regular |
| Footnote | 13pt | 18pt | Regular |
| Caption 1 | 12pt | 16pt | Regular |
| Caption 2 | 11pt | 13pt | Regular |

**[Web adaptation]** This site is fully responsive (not fixed-point like native iOS/macOS), so each row becomes a fluid `clamp()` custom property instead of a fixed px value — same ratios, scales with viewport instead of breaking at fixed breakpoints:

```css
:root {
  --type-large-title: clamp(1.75rem, 1.4rem + 1.5vw, 2.125rem); /* 28px → 34px */
  --type-title-1:     clamp(1.5rem, 1.25rem + 1vw, 1.75rem);    /* 24px → 28px */
  --type-title-2:     clamp(1.25rem, 1.1rem + 0.6vw, 1.375rem); /* 20px → 22px */
  --type-title-3:     clamp(1.125rem, 1rem + 0.5vw, 1.25rem);   /* 18px → 20px */
  --type-headline:    1.0625rem;  /* 17px, fixed — matches HIG legibility floor */
  --type-body:        1.0625rem;  /* 17px */
  --type-callout:     1rem;       /* 16px */
  --type-subhead:     0.9375rem;  /* 15px */
  --type-footnote:    0.8125rem;  /* 13px */
  --type-caption-1:   0.75rem;    /* 12px */
  --type-caption-2:   0.6875rem;  /* 11px */
}
```

## Weight usage

**[HIG-sourced, supersedes old rule]** The previous project rule ("only 400 or 700, never 500/600") is **retracted** — Apple's own Headline style is Semibold (600), not Bold. Correct rule:

- **Regular (400)** — body copy, captions, subheads
- **Semibold (600)** — headlines, active/emphasized states, nav labels
- **Bold (700)** — reserved for rare hero display moments (a page's single large title), not general emphasis

Never use weights outside this set (no 300, 500, 800, 900) — Apple's own interfaces don't either.

## Tracking (letter-spacing)

**[HIG-sourced]** Apple tightens tracking at large display sizes and loosens (or leaves neutral) at small sizes — never a single fixed value everywhere:

| Size range | Tracking |
|---|---|
| Large Title / Title 1 (28px+) | `-0.02em` to `-0.03em` |
| Title 2 / Title 3 (20-22px) | `-0.01em` to `-0.02em` |
| Headline / Body / Callout (16-17px) | `0` |
| Subhead / Footnote (13-15px) | `0` |
| Caption 1 / Caption 2 (11-12px) | `+0.01em` (slight opening for legibility at small size) |

## Accessibility

**[HIG-sourced]** Use `rem` units, never hardcode `px` for font-size — this respects the user's OS/browser text-size preference (the web equivalent of Dynamic Type). Never lock a component's font size below the 17px/1.0625rem Body legibility floor for primary reading content.

## Sources

- [Typography — Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/typography)
- [The details of UI typography — WWDC20](https://developer.apple.com/videos/play/wwdc2020/10175/)
```

- [ ] **Step 2: Verify consistency**

Confirm the `clamp()` values in the CSS block match the pt→px conversions implied by the type-scale table above them (1pt ≈ 1px at standard web DPI).

- [ ] **Step 3: Commit**

```bash
git add docs/design-system/typography.md
git commit -m "$(cat <<'EOF'
Add typography reference doc

SF Pro type scale, fluid clamp()-based sizing for full responsiveness,
corrected weight rule (Semibold for headlines, not just Bold), and
size-dependent tracking values sourced from Apple HIG.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Write `docs/design-system/motion.md`

**Files:**
- Create: `docs/design-system/motion.md`

- [ ] **Step 1: Write the file**

```markdown
# Motion

> Read this before writing any Framer Motion `transition` or `variants` block.

## Apple's native spring reference values

**[HIG-sourced]** SwiftUI's system springs, for reference:

- `.spring()` (general-purpose) — `response: 0.55`, `dampingFraction: 0.825`
- `.interactiveSpring()` (gesture-driven, near-instant) — `response: 0.15`, `dampingFraction: 0.86`

Framer Motion doesn't use `response`/`dampingFraction` — it uses `stiffness`/`damping`/`mass`. There's no exact algebraic conversion between the two systems, so the presets below are tuned to *feel* equivalent, not derived by formula.

## Framer Motion presets for this codebase

**[Web adaptation]** These four presets are already in use and validated — standardize on them rather than inventing new stiffness/damping combinations per component:

```ts
export const SPRINGS = {
  // Panel/sheet entrance — settling-in feel, matches .spring()
  entrance: { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 },

  // Dock/floating-element entrance — soft bounce-in
  dockEntrance: { type: "spring", stiffness: 260, damping: 25, mass: 0.8 },

  // Tap/press feedback and hover reactions — matches .interactiveSpring()'s near-instant feel
  tapPress: { type: "spring", stiffness: 400, damping: 17 },
  iconActivate: { type: "spring", stiffness: 500, damping: 30 },

  // Shared layoutId transitions (e.g. an active-tab indicator sliding between positions)
  indicatorSlide: { type: "spring", stiffness: 350, damping: 30, mass: 0.8 },
} as const;
```

## Non-spring easing

**[HIG-sourced]** Use `easeOut` — `cubic-bezier(0, 0, 0.58, 1)` — for staggered fade/slide entrances where a spring would feel excessive (list items revealing in sequence, not a physical object settling):

```ts
transition: { duration: 0.4, ease: [0, 0, 0.58, 1] }
```

## Duration guidance

**[HIG-sourced]**

| Interaction | Duration | Curve |
|---|---|---|
| Micro (color/opacity on hover) | 150-220ms | ease |
| Sheet/overlay open | 200-340ms | spring (`entrance` or `dockEntrance`) |
| Staggered list reveal | 30-50ms delay between items | `easeOut` |

## Reduced motion

**[HIG-sourced]** `prefers-reduced-motion: reduce` → disable spring bounce/parallax/lensing entirely, replace with a plain opacity cross-fade at 150ms. Never fully remove feedback — accessibility means *no excess motion*, not *no motion at all*.

## Gesture rule

**[HIG-sourced]** Draggable elements (the project card strip) use `dragElastic` in the `0.12-0.15` range with momentum-based decay on release — never a hard stop at the drag constraint boundary.

## Sources

- [Motion — Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/motion)
- [spring(response:dampingFraction:blendDuration:) — Apple Developer Documentation](https://developer.apple.com/documentation/swiftui/animation/spring(response:dampingfraction:blendduration:))
- [interactiveSpring(response:dampingFraction:blendDuration:) — Apple Developer Documentation](https://developer.apple.com/documentation/swiftui/animation/interactivespring(response:dampingfraction:blendduration:))
```

- [ ] **Step 2: Verify consistency**

Confirm the `SPRINGS` values in this doc exactly match what's currently in the codebase (`RightNav`'s old entrance transition was `stiffness 520, damping 44, mass 0.85` before removal in Task 2 — same values carry forward as the documented standard even though `RightNav` itself is gone; `MobileTabBar`'s `dockEntrance` is `stiffness 260, damping 25, mass 0.8` — confirm against `components/ui/MobileTabBar.tsx`'s `SPRINGS` constant).

- [ ] **Step 3: Commit**

```bash
git add docs/design-system/motion.md
git commit -m "$(cat <<'EOF'
Add motion reference doc

Documents Apple's native spring values alongside the Framer Motion
stiffness/damping presets already validated in this codebase, plus
easing, duration, and reduced-motion rules sourced from Apple HIG.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Write `docs/design-system/layout.md`

**Files:**
- Create: `docs/design-system/layout.md`

- [ ] **Step 1: Write the file**

```markdown
# Layout

> Read this before setting spacing, breakpoints, or corner radii on any container.

## Concentricity

**[HIG-sourced]** See `materials-glass.md` for the full rule — restated here because it's a layout constraint as much as a material one: a child element's corner radius must equal `containerRadius - childInset`. Check this any time you nest a glass or card element inside another rounded container.

## Spacing scale

**[HIG-sourced]** 8pt-grid increments:

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 32px;
  --space-8: 40px;
  --space-9: 48px;
  --space-10: 64px;
}
```

## Safe areas

**[HIG-sourced]** Always use `env(safe-area-inset-*)` for any fixed/floating element near a device edge on mobile — already done correctly in `MobileTabBar.tsx` (`paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))"`). Treat that as the standard pattern for any new floating element, not a one-off.

## Responsive breakpoints

**[Web adaptation, supersedes old rule]** The previous project rule ("no responsive breakpoints, desktop-first fixed layout") is **retracted** — this codebase has been fully responsive for several sessions already and the new direction explicitly requires it. Standard tiers, matching what's already implemented in `contexts/LayoutContext.tsx`:

| Tier | Range |
|---|---|
| Phone | `< 640px` |
| Tablet | `640px – 1023px` |
| Desktop | `≥ 1024px` |

Use these exact numbers everywhere — don't invent new breakpoint values per component.

## macOS chrome → web translation

**[Web adaptation]** How native macOS Tahoe chrome concepts map onto this site:

| macOS concept | Web equivalent here |
|---|---|
| Menu bar | Not applicable — the browser owns this, don't fake it |
| Dock | Floating bottom-center pill nav — already built for phone in `MobileTabBar.tsx`; becomes the primary nav on desktop/tablet too once the user's Dock component spec lands |
| Translucent sidebar | `LeftSidebar` — currently opaque `--bg-card`; upgrade to `--glass-regular-bg` from `materials-glass.md` when the sidebar is next touched (not in this pass) |
| Toolbar | `BottomToolbar.tsx` |
| Window traffic lights | Not applicable — no window chrome to fake in a browser tab |

## Scroll edge effect (layout-level)

**[HIG-sourced]** Any fixed/floating glass element with scrollable content passing behind it needs a fade or hard-backed boundary where they meet — see `materials-glass.md`'s "Scroll edge effect" section for the exact technique. Check this whenever a new floating element is added over `MainCanvas` or any scrollable page content.

## Readable content width

**[HIG-sourced]** Restrict body-copy text blocks (bio, project descriptions) to 65-75 characters per line for readability — use `max-width: 65ch` (or similar) on prose containers rather than letting text stretch full-width on large viewports.

## Sources

- [Layout — Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/layout)
- [The evolution of Mac app window corners](https://lapcatsoftware.com/articles/2026/3/4.html)
- [All the Liquid Glass Changes in macOS Golden Gate — MacRumors](https://www.macrumors.com/2026/06/09/macos-golden-gate-liquid-glass/)
```

- [ ] **Step 2: Verify consistency**

Confirm the breakpoint table matches the literal numbers in `contexts/LayoutContext.tsx` (`w < 1024` for mobile, `w >= 640 && w < 1024` for tablet) after Task 2's edits.

- [ ] **Step 3: Commit**

```bash
git add docs/design-system/layout.md
git commit -m "$(cat <<'EOF'
Add layout reference doc

Spacing scale, safe-area rules, and responsive breakpoints (explicitly
retracting the old no-breakpoints rule), plus a macOS-chrome-to-web
translation table for the upcoming Dock/sidebar work.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Write `docs/design-system/README.md`

**Files:**
- Create: `docs/design-system/README.md`
- Delete: `MASTER.md`

**Interfaces:**
- Consumes: the existence of `materials-glass.md`, `typography.md`, `motion.md`, `layout.md` from Tasks 4-7

- [ ] **Step 1: Write the index file**

```markdown
# Design System — Index

This directory replaces the old `MASTER.md`. It's the detailed reference for the Apple/Liquid-Glass visual identity this portfolio is being rebuilt around. `CLAUDE.md` stays short on purpose (it loads into every message) — read the file below that matches what you're building, not all four every time.

| Doc | Read it when you're... |
|---|---|
| [`materials-glass.md`](./materials-glass.md) | touching any floating/glass surface — dock, modals, toolbars, overlays, card hover states |
| [`typography.md`](./typography.md) | setting any font-size, weight, or letter-spacing |
| [`motion.md`](./motion.md) | writing a Framer Motion `transition` or `variants` block |
| [`layout.md`](./layout.md) | setting spacing, breakpoints, corner radii, or working on responsive behavior |

## How this differs from the old spec

The project started as a pixel-perfect kalyp.so clone (see git history for the old `MASTER.md`/`CLAUDE.md`). That's retired. Current direction: an Apple/macOS-inspired visual identity built around the Liquid Glass material system, navigated via a macOS-style Dock (replacing the old always-present right-hand nav panel), fully responsive.

Two rules from the old spec are explicitly retracted, not just superseded — see the docs above for the replacement:
- ~~No responsive breakpoints~~ → `layout.md`
- ~~Only font-weight 400 or 700~~ → `typography.md`

Everything else in `CLAUDE.md`'s "Hard Rules" is still true unless a doc above says otherwise.
```

- [ ] **Step 2: Delete the old MASTER.md**

```bash
git rm MASTER.md
```

- [ ] **Step 3: Verify no remaining references to the deleted file**

Run:

```bash
grep -rln "MASTER.md" --include="*.md" . | grep -v node_modules
```

Expected: no output (Task 9 will remove the `CLAUDE.md`/`AGENTS.md` references in the next task — if this task runs before Task 9, seeing `CLAUDE.md`/`AGENTS.md` in the output here is expected and will be resolved there).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Add design-system index, retire MASTER.md

README.md indexes the four topic docs and explains what changed from
the old kalyp.so-clone spec. MASTER.md's useful content has been
migrated into docs/design-system/ across the prior four tasks.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Rewrite `CLAUDE.md` and `AGENTS.md`

**Files:**
- Modify: `CLAUDE.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: `docs/design-system/README.md` existing (Task 8)

- [ ] **Step 1: Replace `CLAUDE.md` in full**

```markdown
# CLAUDE.md — Portfolio (Apple / Liquid Glass identity)

> This portfolio's visual identity is being rebuilt around Apple's design language — specifically the Liquid Glass material system (WWDC 2025 / iOS 26 / macOS Tahoe) — navigated via a macOS-style Dock. It started as a pixel-perfect kalyp.so clone; that spec is retired (see git history).

## Read before frontend work

Don't load all of these every session — read whichever matches what you're building:

| Doc | Read it when you're... |
|---|---|
| [`docs/design-system/README.md`](docs/design-system/README.md) | starting any design-system work — index of the docs below |
| [`docs/design-system/materials-glass.md`](docs/design-system/materials-glass.md) | touching any floating/glass surface |
| [`docs/design-system/typography.md`](docs/design-system/typography.md) | setting font-size, weight, or tracking |
| [`docs/design-system/motion.md`](docs/design-system/motion.md) | writing a Framer Motion transition |
| [`docs/design-system/layout.md`](docs/design-system/layout.md) | spacing, breakpoints, responsive behavior |

## Hard rules (still true)

- No component libraries (shadcn, MUI, Chakra, etc.) — build from Tailwind + Framer Motion
- Framer Motion for all animation — no CSS keyframes except simple color/opacity transitions
- This is a portfolio *inspired by* Apple's design language, not a literal Apple product — never claim Apple trademarks/branding
- Every claim in the design-system docs is flagged `[HIG-sourced]` or `[Web adaptation]` — keep that discipline when extending them

## Retracted rules (do not follow these anymore)

- ~~No gradients / no shadows anywhere~~ — Liquid Glass materials use real shadows, highlights, and tint gradients by design; see `materials-glass.md`
- ~~Desktop-first, no responsive breakpoints~~ — this site is fully responsive; see `layout.md` for the exact breakpoint tiers
- ~~Only font-weight 400 or 700~~ — Apple's own Headline style is Semibold (600); see `typography.md`
- ~~Fixed right-hand nav panel~~ — navigation is moving to a macOS-style Dock (in progress)

## Local development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). There is no `serve.mjs` in this repo — use the Next.js dev server directly. `screenshot.mjs` (Puppeteer) exists for manual visual comparison against localhost; don't hardcode machine-specific paths into it.

## Personal content

This is Shajith Bathina's personal developer portfolio — GitHub/LeetCode/LinkedIn handle `shajith240`. Content lives in `data/` and the page components; don't reintroduce placeholder/template content.
```

- [ ] **Step 2: Replace `AGENTS.md` with the identical content**

Copy the exact same content from Step 1 into `AGENTS.md`, changing only the first heading line to:

```markdown
# AGENTS.md — Portfolio (Apple / Liquid Glass identity)
```

Everything else in the file is byte-for-byte identical to `CLAUDE.md`.

- [ ] **Step 3: Verify no stale references remain**

Run:

```bash
grep -rn "kalyp.so\|serve.mjs\|C:/Users/nateh" CLAUDE.md AGENTS.md
```

Expected: no output.

```bash
grep -rln "MASTER.md" --include="*.md" . | grep -v node_modules
```

Expected: no output (this confirms Task 8's `MASTER.md` deletion has no dangling references from either file now).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md AGENTS.md
git commit -m "$(cat <<'EOF'
Rewrite CLAUDE.md/AGENTS.md for the Apple/Liquid Glass direction

Both files shrink to hard rules + a pointer into docs/design-system/,
keeping per-message token cost low. Explicitly retracts the rules that
no longer apply (no shadows/gradients, no responsive breakpoints,
weight 400/700 only, fixed right-hand nav) and drops the stale
kalyp.so-clone framing and machine-specific serve.mjs instructions.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Plan self-review notes

- **Spec coverage:** Task 1 covers spec Part 1's sound removal; Task 2 covers RightNav/MenuButton/LayoutContext; Task 3 covers the Big Sur `.gitignore` entry; Tasks 4-7 cover the four design-system docs from spec Part 2; Task 8-9 cover spec Part 3's `CLAUDE.md`/`AGENTS.md`/`MASTER.md` rewrite. All spec sections have a corresponding task.
- **Placeholder scan:** no TBD/TODO markers; every doc task contains complete file content, not a description of content.
- **Type consistency:** `LayoutContextValue` interface in Task 2 drops exactly `isNavOpen`/`toggleNav` and nothing else; verified against every other consumer found via grep (`LeftSidebar`, `BottomToolbar`, `CommandPalette`, `MobileTabBar` — none of them read `isNavOpen`/`toggleNav`).
- **Scope:** building the actual Dock/new nav UI and any `LeftSidebar` visual rebuild are explicitly out of scope — deferred to the follow-up session once the user shares their Dock component spec.
