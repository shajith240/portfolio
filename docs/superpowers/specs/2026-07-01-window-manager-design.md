# macOS Window Manager + Navigation Model

**Date:** 2026-07-01
**Status:** Approved for implementation

## Context

Following the desktop shell (wallpaper, floating widgets, MenuBar, Dock), the user wants full macOS-authentic interaction: multiple overlapping draggable windows (not a single-window-at-a-time simplification), a desktop right-click context menu, and a wallpaper picker reading from `public/wallpapers/`. This spec covers the foundational piece everything else depends on — the window manager and the Dock's navigation model — plus the two smaller, self-contained pieces (right-click menu, wallpaper picker) that ride along with it. **The Finder-style file browser is explicitly out of scope** — it's a separate future spec once windows exist to host it in.

Explicit requirement from the user: this must feel "exact smooth as exact MacBook Pro" — the same smoothness bar as the Dock. The Dock's own history this session is the cautionary tale: a hand-rolled `requestAnimationFrame` + React-state loop caused real bugs (container reflow, stale-closure stuck state, desynced width). The fixes that actually worked were (a) using Framer Motion's own motion-value pipeline instead of driving continuous animation through React state, and (b) never measuring position from an element whose own size/position is mid-animation. This spec applies both lessons directly: **window dragging uses Framer Motion's native `drag` + `useDragControls`**, not a custom pointer-tracking loop.

## Decisions from brainstorming

- Multiple windows can be open and overlapping simultaneously (not one-at-a-time).
- Window content is an `<iframe src={route}>` — existing pages (`/about`, `/projects`, `/skills`, `/dsa`, `/notes`, `/uses`) render unmodified inside the window's content area. No changes to any existing page.
- Window resizing (drag an edge/corner to resize) is **out of scope this pass** — windows open at a fixed default size.
- Right-click context menu: only "Change Wallpaper..." is a real action; New Folder / Sort By / Get Info are decorative-for-now, matching the same "build the UI, wire functionality later" call made for the MenuBar.
- Wallpaper picker is a lightweight glass popover (not a Finder window — real macOS's own wallpaper picker is a System Settings pane, not a file browser), reading the 5 images already in `public/wallpapers/`, persisted via `localStorage`.

## Architecture

### `WindowManagerContext` (new, `contexts/WindowManagerContext.tsx`)

```ts
interface WindowState {
  id: string;          // stable id, one per open app instance — here, same as route
  route: string;        // e.g. "/about" — passed to the iframe's src
  title: string;         // from NAV_ITEMS label
  x: number; y: number;  // top-left position, px, relative to viewport
  width: number; height: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
}

interface WindowManagerContextValue {
  windows: WindowState[];
  openWindow: (route: string, title: string) => void;   // opens new, or focuses+un-minimizes existing
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  bringToFront: (id: string) => void;
  registerDockIconEl: (route: string, el: HTMLElement | null) => void; // for open/minimize animation targets
  getDockIconRect: (route: string) => DOMRect | null;
}
```

- `openWindow`: if a window for that route already exists, un-minimizes it and calls `bringToFront`. Otherwise creates a new `WindowState` with a cascading default position (each new window offset +24px/+24px from the last, wrapping back near the top-left after a few, matching real macOS's cascade behavior) and default size `Math.min(900, viewportWidth * 0.7)` × `Math.min(640, viewportHeight * 0.75)`.
- `bringToFront`: assigns `zIndex = ++topZIndexRef.current` (a ref-held counter, not state — no need to re-render every window on every focus change beyond the one whose z-index actually changed).
- `registerDockIconEl`/`getDockIconRect`: `Dock.tsx`'s icon wrapper calls `registerDockIconEl(item.href, el)` via a ref callback on mount; `Window` reads the rect once when computing its open/minimize animation target (matches the "measure once, not every frame" lesson from the Dock's own bug history — this is a one-time read on open/close, not a continuous per-frame measurement, so it can't reintroduce that class of bug).

### `Window` component (new, `components/window/Window.tsx`)

One per open (non-minimized) `WindowState`, rendered by a new `WindowLayer` in `AppShell`.

- **Chrome:** 28px titlebar, Liquid Glass background (`--glass-regular-bg`/blur tokens, same as MenuBar/Dock), centered title text, traffic lights top-left per Apple's actual documented behavior — confirmed via research, not guessed: red closes the window (not the app), yellow reduces it to the Dock, green enters fullscreen; controls must never be hidden or repositioned from the top-left. Colors: red `#FF5F57`, yellow `#FEBC2E`, green `#28C840`, 12px circles, 8px gaps — well-established values from community-verified macOS UI references, flagged `[Web adaptation]` since Apple doesn't publish the exact hex.
- **Dragging:** `<motion.div drag dragControls={dragControls} dragListener={false} dragMomentum={false} dragElastic={0}>` — `dragListener={false}` means only an explicit `dragControls.start(e)` call (wired to the titlebar's `onPointerDown`) can initiate a drag, so clicking/scrolling inside the iframe content never accidentally drags the window. This is Framer Motion's own built-in drag system, not a hand-rolled pointer-tracking loop — it owns the frame-by-frame position updates internally.
- **Focus:** `onPointerDown` anywhere in the window (chrome or content wrapper, captured before the iframe swallows it) calls `bringToFront(id)`.
- **Open animation:** springs in from the triggering Dock icon's rect (read once via `getDockIconRect`) to its final cascaded position/size — `initial={{ x: iconRect.x, y: iconRect.y, scale: 0.2, opacity: 0 }}`, animate to the real position/size/scale 1/opacity 1, spring per `docs/design-system/motion.md`'s `entrance` preset.
- **Minimize (yellow):** reverse of the open animation — scale/move toward the Dock icon's current rect, fade out, then set `minimized: true` in state once the animation completes (`onAnimationComplete`). This is an approximation of the real genie effect (which distorts window geometry via a custom warp, not just scale+translate) — flagged `[Web adaptation]`, not a literal genie-effect recreation.
- **Maximize (green):** animates width/height/x/y to fill the desktop area (between MenuBar's bottom and the Dock's top), spring transition; clicking again animates back to the pre-maximize size/position (stored on the `WindowState` when maximizing).
- **Close (red):** removes from `windows` array; no exit animation needed beyond a quick fade/scale-down (matches real macOS's close animation being much subtler than open/minimize).

### Dock integration (`components/ui/Dock.tsx`)

- Replace `onClick={() => router.push(item.href)}` with `onClick={() => openWindow(item.href, item.label)}`.
- Active-dot indicator changes from `pathname === item.href` to `windows.some(w => w.route === item.href && !w.minimized ... )` — actually: dot should show for ANY open window regardless of minimized state (matches real macOS: the dot means "running," not "visible"). So: `windows.some(w => w.route === item.href)`.
- Each icon's wrapper div gets a ref callback: `ref={(el) => registerDockIconEl(item.href, el)}`.

### Desktop right-click menu (new, `components/layout/DesktopContextMenu.tsx`)

- `onContextMenu` handler on `Wallpaper.tsx` (the empty-desktop layer) — `e.preventDefault()`, opens a glass menu at the cursor position.
- Items: **Change Wallpaper...** (real — opens the picker), New Folder, Get Info, Sort By ▸ (decorative, `cursor: default`, slightly dimmed to read as inactive rather than broken).
- Closes on: selecting an item, clicking elsewhere, `Escape`.
- Does NOT show if the right-click originated on a widget, window, or the Dock/MenuBar (check `e.target` is the Wallpaper element itself, not a descendant of those).

### Wallpaper picker (new, `components/widgets/WallpaperPicker.tsx`)

- Triggered by the context menu's "Change Wallpaper..." item.
- Glass popover, grid of thumbnails for all files in `public/wallpapers/` (hardcoded array of the 5 known filenames — no filesystem listing API needed for a static asset folder).
- Clicking a thumbnail: calls `setWallpaper(url)` (a small new `useWallpaper` hook backed by `localStorage`, read by `Wallpaper.tsx` on mount — SSR-safe: render the existing placeholder gradient on first server render, swap to the stored image in a `useEffect`, matching the codebase's established hydration-safe pattern).
- Closes the popover after selection.

## Global constraints carried over

- Framer Motion for all animation — window drag specifically must use Framer's native `drag`, not a custom rAF/state loop (see Context section)
- No component libraries
- Liquid Glass tokens (`--glass-*`) for all chrome — titlebar, context menu, wallpaper picker
- SSR/hydration-safe patterns for anything reading `localStorage` or `window`

## Explicitly out of scope (future passes)

- Finder-style file browser (own future spec)
- Window resizing via edge/corner drag
- True genie-effect geometry warp (using a scale+translate approximation instead)
- Multi-monitor / display-arrangement features
- Making right-click menu items beyond "Change Wallpaper" functional

## Verification

- `npm run build` succeeds, no dangling imports
- Manual: open 3+ windows from the Dock, confirm they cascade, drag each by its titlebar, confirm click-to-front z-ordering, minimize one (animates toward its Dock icon, dot stays lit, Dock click restores it), maximize one (fills desktop, toggles back), close one (removed cleanly)
- Right-click empty wallpaper → menu appears at cursor; right-click a widget/window → menu does NOT appear
- Change Wallpaper → picker shows all 5 images from `public/wallpapers/` → selecting one applies immediately and persists across a page reload
- No console errors, no hydration warnings
