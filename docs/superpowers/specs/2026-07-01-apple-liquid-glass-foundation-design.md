# Apple / Liquid Glass Foundation — Cleanup + Design System Docs

**Date:** 2026-07-01
**Status:** Approved for implementation

## Context

The portfolio was originally scaffolded as a pixel-perfect kalyp.so clone (see old `CLAUDE.md`/`MASTER.md`), then evolved well past that spec over prior sessions — real personal content, a DSA/skills/tools section, sound + haptic feedback, and a full mobile-responsive overhaul that directly contradicts the old "desktop-first, no breakpoints" rule.

New direction: rebuild the visual identity around Apple's design language — specifically the "Liquid Glass" material system (WWDC 2025 / iOS 26 / macOS Tahoe) — with a macOS/MacBook-flavored navigation model (a dock, not a persistent right-hand nav panel) and full responsiveness. The user already has a Dock component spec they'll provide in a follow-up session; this spec covers only the foundation work that has to happen first: ripping out what's being replaced, and producing the design-system reference docs that all future component work will build against.

## Scope

**In scope:**
1. Remove `RightNav` and its wiring (replaced later by the user's own Dock component — not built in this pass)
2. Remove the sound-effect system (audio playback), keeping the sound toggle UI/state as an inert placeholder
2. Exclude the accidentally-committed 374MB Big Sur design-kit folder from git
3. Research and write a topic-split Apple/Liquid Glass design-system reference under `docs/design-system/`
4. Rewrite `CLAUDE.md` and `AGENTS.md` to be short, current, and point at the new docs instead of embedding everything inline

**Out of scope (deferred to a future spec once the user shares the Dock component doc):**
- Building the actual Dock / new navigation UI
- Any visual rebuild of `LeftSidebar`, cards, project pages, etc.
- Wiring the sound toggle to any new behavior (haptics, etc.)

## Part 1 — Cleanup

### Remove
- `components/layout/RightNav.tsx`
- `components/ui/MenuButton.tsx` (sole purpose is toggling RightNav open/closed — dead once RightNav is gone)
- `lib/useClickSound.ts`
- `lib/useHoverSound.ts`
- `public/sounds/click.wav`
- `public/sounds/sidebar_sound.mp3` (already unreferenced in code — confirmed via repo-wide grep)

### Edit
- `components/layout/AppShell.tsx` — remove the `RightNav`/`MenuButton` imports and their render in the desktop branch. Desktop has no nav UI until the Dock is built in a later session — the user has confirmed this gap is acceptable since they're bringing their own Dock spec next.
- `contexts/LayoutContext.tsx` — remove `isNavOpen` / `toggleNav` and every reference to them (including the `isMobileLayout` cross-references inside `toggleSidebar` and `closeSidebars`). `isSidebarOpen` / `toggleSidebar` stay untouched — `LeftSidebar` still depends on them and `LeftSidebar` is explicitly out of scope for this pass.
- `components/layout/LeftSidebar.tsx`, `components/ui/BottomToolbar.tsx`, `components/ui/CommandPalette.tsx` — remove the `useClickSound`/`useHoverSound` imports and the `playClick()`/`playHover()` call sites. No other behavior in these files changes.
- `.gitignore` — add `ndwimpgPQRiKqUcOz7t6_MacOS-11-Big-Sur/`

### Explicitly kept
- The sound toggle button in `BottomToolbar.tsx` and `isSoundEnabled` / `toggleSound` in `LayoutContext` stay exactly as they are. After this cleanup they're functionally inert (nothing plays audio anymore), but the UI element and state remain for potential future re-wiring.
- `data/nav.ts` (`NAV_ITEMS`) stays — `MobileTabBar`'s nav overlay sheet still consumes it independently of `RightNav`.

## Part 2 — Apple / Liquid Glass Design System Docs

### Research approach
Ground the doc in real Apple documentation rather than memory alone: Apple Human Interface Guidelines plus the WWDC 2025 "Liquid Glass" material introduced for iOS 26 / macOS 26 (Tahoe). Pull via web search/fetch. Cover:
- **Materials/vibrancy** — regular vs. clear glass, lensing/refraction behavior, adaptive light/dark tinting, how elevation and blur interact
- **Typography** — SF Pro type scale, weights, tracking, dynamic type behavior
- **Motion** — actual spring stiffness/damping values and easing curves Apple uses system-wide, gesture physics
- **Layout** — 8pt grid, safe areas, macOS chrome conventions (dock, translucent sidebar, menu bar) — translated to web equivalents, not copied verbatim
- **Iconography** — SF Symbols weight/scale conventions

Since this is a portfolio *inspired by* Apple rather than a literal system surface, every doc explicitly flags which rules are direct HIG quotes vs. adaptations for a web context.

### File structure

```
docs/design-system/
  README.md            — index: what's in each doc, when to read it, how it supersedes old MASTER.md
  materials-glass.md   — Liquid Glass specs: blur radius, saturation, refraction, tint layers, elevation/shadow rules
  typography.md        — font stack, type scale, weights, tracking values
  motion.md            — spring configs, easing curves, durations, gesture physics
  layout.md            — grid, spacing, breakpoints, responsive rules, macOS chrome patterns for web
```

These are read on-demand (per the pointer in `CLAUDE.md`), not loaded into every message.

## Part 3 — CLAUDE.md / AGENTS.md Rewrite

Both files get replaced with a short, current version:
- States the actual current identity: Apple/macOS-inspired, Liquid Glass materials, fully responsive (explicitly retracts the old "no gradients/no shadows/no responsive breakpoints/kalyp.so clone" framing — those rules no longer apply)
- Points to `docs/design-system/README.md` and which doc to consult for which kind of work
- Keeps only rules still genuinely true project-wide (e.g., no component libraries, Framer Motion for animation, this is a personal portfolio not a literal Apple product)
- Drops the Step 0-6 kalyp.so build order, the old flat design-token table, the animation table (content migrates into `docs/design-system/motion.md` and `materials-glass.md`), and the `serve.mjs`/hardcoded `C:/Users/nateh/...` Puppeteer paths (leftover from a different machine/template — `serve.mjs` doesn't exist in this repo; corrected to reflect the actual `npm run dev` Next.js workflow)
- `AGENTS.md` mirrors `CLAUDE.md` exactly, as it does today

Old `MASTER.md` content is retired — its useful content is superseded by the new `docs/design-system/` docs.

## Verification

- `npm run build` (or `next build`) succeeds with no dangling imports after removing RightNav/MenuButton/sound hooks
- Grep confirms no remaining references to `RightNav`, `MenuButton`, `useClickSound`, `useHoverSound`, `isNavOpen`, `toggleNav` anywhere in the codebase
- `git status` confirms the Big Sur folder is ignored, not staged
- Manual check: app runs on desktop with `LeftSidebar` + `BottomToolbar` intact and no console errors; sound toggle button still renders and toggles state (just no audio)
