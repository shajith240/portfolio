# Genie-Effect Minimize + Finder File Browser

**Date:** 2026-07-01
**Status:** Approved for implementation

## Context

Two independent features, built together per explicit request: (1) replace the current scale+move minimize approximation with the real clip-path funnel warp, and (2) a new Finder app opening as its own window, browsing a simulated file system that mirrors real portfolio content.

**Hard constraint, confirmed by the user:** the existing Dock-linked pages (`/skills` showing every skill at once in a gallery, `/projects` showing every project at once, etc.) are untouched — still full pages, still in the Dock, still opened via `openWindow()` exactly as today. Finder is purely additive: a second, file-system-flavored path toward the same content, never a replacement.

## Part 1 — Genie-effect minimize

### Research grounding

Real macOS behavior (documented, not guessed): the window's bottom edge shears and narrows while the top edge stays fixed; the sides curve inward like a funnel; the window's content follows that curved path down into the Dock. Native macOS achieves this via SpriteKit mesh-warp geometry (`SKWarpGeometryGrid`) — genuine per-pixel mesh distortion.

**[Web adaptation]** True per-pixel mesh warping requires rasterizing the window's live content to a canvas every frame. For an iframe (our window content), that means cross-frame rasterization, which is fragile and unreliable even same-origin in most browsers. Instead: animate the window's `clip-path` from a full rectangle to a procedurally-generated tapering polygon that converges on the Dock icon's position — the window's *silhouette* genuinely funnels the same way the real effect does, without needing to rasterize pixels. This is a documented, legitimate simplification (referenced directly in prior web recreations of this effect), not an invented shortcut.

### Implementation

- New `genieClipPath(progress, dockIconRect, windowRect)` pure function in `components/window/Window.tsx` (or a small `lib/genieClipPath.ts` if it grows) — given animation progress (0→1), returns a `clip-path: polygon(...)` string. At `progress=0`: a plain rectangle (`0 0, 100% 0, 100% 100%, 0 100%`). At `progress=1`: top two corners unchanged, bottom edge collapsed to a narrow band centered under the Dock icon's x-position (relative to the window's current x). Intermediate frames interpolate the bottom-edge width and the two side curves (using a handful of interpolated points along each side, not just 4 corners, so the sides read as curved rather than a straight-sided triangle).
- Driven by a `useMotionValue(0)` + `animate()` to 1 over ~380ms (matches the existing minimize duration), with an `onUpdate` callback recomputing the `clip-path` inline style each frame — same "Framer owns the frame loop" principle already established for dragging, not a hand-rolled rAF loop.
- Runs *simultaneously* with the existing position/scale animation toward the Dock icon (already built) — the funnel shape plus the shrink-and-move together produce the full effect.
- On `onComplete`, same as today: call `minimizeWindow(win.id)`.
- Restoring (clicking the Dock icon again) reverses the same clip-path animation from 1→0 alongside the existing un-minimize position animation.

## Part 2 — Finder

### Content tree (real data only, verified against existing pages — no invented content)

```
Macintosh HD/
├── About Me.rtf                    → openWindow("/about", "About")
├── Projects/
│   ├── SHARPFLOW.app
│   ├── IntelliDesk.app
│   ├── WIFI-AUTOMATION.app
│   └── linux-container-runtime.app
│   (from data/projects.ts — title/tech/description/github per project)
├── Skills/
│   ├── Languages/         (JavaScript, TypeScript, Python, C, Java, HTML, CSS)
│   ├── Frameworks/        (React, Node.js, Antigravity)
│   ├── Tools & DevOps/    (Git, GitHub, VS Code, Docker, Linux, N8N)
│   ├── Databases/         (MongoDB, PostgreSQL)
│   └── AI Tools/          (ChatGPT, Claude, Gemini)
│   (exact categories/icons from app/skills/page.tsx's CATEGORIES — same /icons/*.png files)
├── DSA.app                         → openWindow("/dsa", "DSA")
├── Notes.app                       → openWindow("/notes", "Notes")
│   (NOTES array in app/notes/page.tsx is currently empty — a browsable
│   Notes/ folder with individual entries would mean inventing content
│   that doesn't exist yet, so this is a single file like DSA.app/Uses.app,
│   not a folder. Revisit once real notes exist.)
└── Uses.app                        → openWindow("/uses", "Uses")
```

- **Project files** (`SHARPFLOW.app` etc.): double-click opens a Quick-Look-style preview panel (title, tech tags, description, a "GitHub →" link opening the real repo URL in a new tab, an "Open in Projects" button calling `openWindow("/projects", "Projects")`).
- **Skill icon files**: double-click shows a minimal preview (icon + name) — no deeper action, matching how real Finder previews a generic file with no default app.
- **Folders** (`Projects/`, `Skills/`, `Languages/`, etc.): double-click navigates the same window's content pane one level deeper (real Finder behavior — not a new window per folder).
- **`.app`/`.rtf` files**: double-click calls `openWindow()` directly, same as a Dock icon would.

### Finder window architecture

- New `components/window/FinderApp.tsx` — the actual browsing UI (sidebar + toolbar + content pane), NOT an iframe.
- `WindowState` gains an optional discriminator: `kind: "iframe" | "finder"` (default `"iframe"` for all existing window-opening call sites, so nothing else changes). `Window.tsx` renders `<FinderApp />` instead of an `<iframe>` when `kind === "finder"`.
- New `openFinder()` in `WindowManagerContext`, alongside the existing `openWindow()` — creates a `WindowState` with `kind: "finder"`, `route: "finder"` (a sentinel, not a real URL), default size larger than a typical content window (matches real Finder's roomier default, e.g. 960×620).
- Finder's own internal state (current folder path, e.g. `["Macintosh HD", "Skills", "Languages"]`) lives inside `FinderApp` itself via `useState` — not in `WindowManagerContext`, since it's presentation-only and doesn't need to survive the window being closed and reopened (real Finder windows don't remember their last folder after being fully closed either, by default).
- **Sidebar** (Favorites): Macintosh HD, Projects, Skills — clicking jumps straight to that path.
- **Toolbar**: back/forward (disabled at the ends, matching real Finder graying-out), current folder name centered, icon-grid view only (list/column view views are out of scope — see below).
- **Content pane**: icon grid, each item a squircle-clipped icon (reusing the same `/icons/*.png` set already used everywhere else in the app) + name label underneath, matching the Skills page's existing `AppIcon` visual treatment for consistency.
- New Dock icon for Finder: a simple folder-glyph SVG (inline, not from `/icons/`, since no real icon set exists yet for this — placeholder like everything else in the Dock currently), positioned first in the Dock (real macOS convention: Finder is always the leftmost, permanent Dock icon).

### Global constraints carried over

- Framer Motion for all animation (genie effect's `clip-path` interpolation still driven through Framer's `animate()`/motion values, not a manual rAF loop)
- Liquid Glass tokens for Finder's chrome (sidebar, toolbar) — same `--glass-*` variables as everything else
- No invented content — every Finder entry maps to real, already-existing data
- Existing Dock-linked full pages (`/skills`, `/projects`, etc.) are not modified in any way

## Explicitly out of scope

- List view / column view in Finder (icon grid only, this pass)
- Drag-and-drop reordering, renaming, deleting, or any other real file-manager mutation
- A populated Notes/ folder (revisit once real note content exists)
- True per-pixel genie warp (the clip-path funnel is the documented web adaptation)

## Verification

- `npm run build` succeeds
- Minimize a window: clip-path visibly funnels toward the Dock icon during the animation (not just scale+move), restores cleanly on Dock-icon click
- Finder opens from its own new Dock icon, shows Macintosh HD's contents, navigating into Projects/Skills/subfolders works via double-click, back/forward buttons work and gray out at the ends
- Double-clicking a project file shows its real title/tech/description and a working GitHub link
- Double-clicking `About Me.rtf`/`DSA.app`/`Notes.app`/`Uses.app` opens the exact same window a Dock click would
- `/skills` and `/projects` (and all other existing pages) render completely unchanged when opened via their own Dock icons
