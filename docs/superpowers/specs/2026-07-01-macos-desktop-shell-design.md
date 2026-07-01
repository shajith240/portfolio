# macOS Desktop Shell — Wallpaper, Widgets, Menu Bar

**Date:** 2026-07-01
**Status:** Approved for implementation

## Context

Following the Dock (already shipped), the user wants the rest of the shell to read as an actual macOS desktop: a full-bleed wallpaper (they'll drop in the real macOS image later), floating widgets instead of a confined sidebar, and a top menu bar. This spec covers the foundational shell only — additional widgets (GitHub/LeetCode/LinkedIn) and the real wallpaper image are explicitly deferred to a later pass.

## Decisions from brainstorming

- `LeftSidebar` is **deleted entirely** — no fixed panel, no toggle button. Its content (photo, name, tagline, bio) becomes a floating `ProfileWidget`.
- `ProfileWidget` renders **only on the home route** (`/`) — matches the "desktop" metaphor; sub-pages are "opened apps," not the desktop.
- `MenuBar` is new, rendered globally (all non-phone routes) in `AppShell`. **No Apple logo.** Left slot: current page name (derived from `NAV_ITEMS`, decorative — no dropdown functionality yet, per explicit instruction to build the UI first). Right slot: Control Center icon (opens a small glass panel with the sound + theme toggles), Spotlight icon (opens the existing `CommandPalette`), live clock.
- `BottomToolbar` is deleted. It was rendered per-page (not centrally) in 7 files: `about`, `dsa`, `notes`, `page` (home), `projects`, `skills`, `uses` — all 7 need their import + render removed. Its two jobs (sound/theme toggle, search trigger) move into `MenuBar`.
- `Wallpaper` is new — a fixed full-viewport background layer behind everything, placeholder gradient/image for now.
- Phone (`MobileTabBar`) is untouched.

## Files

**Delete:**
- `components/layout/LeftSidebar.tsx`
- `components/ui/BottomToolbar.tsx`

**Create:**
- `components/layout/Wallpaper.tsx` — fixed full-viewport background, placeholder gradient (dark, matching the site's tone) until the user supplies a real image via a single swappable `WALLPAPER_URL` constant (or drops a file in `public/wallpaper.jpg` — implementer's call, document whichever is chosen inline).
- `components/widgets/ProfileWidget.tsx` — floating widget: photo, "Hey, I'm Shajith / I build things people want to use" tagline (moved verbatim from the old sidebar), "About me" + bio line, "Read more →" linking to `/about`. macOS-widget visual language: ~20px corner radius (vs. the old 10-16px card radius), glass material from `materials-glass.md` (`--glass-regular-bg` tokens), positioned top-left with generous padding (`metrics.inset`-based, not hardcoded). Photo path stays `/photos/my_photo.jpeg`.
- `components/layout/MenuBar.tsx` — fixed top bar, ~26px content height + padding, glass material, `position: fixed, top: 0, left: 0, right: 0, zIndex: 200` (above Dock/widgets). Page-name label via `NAV_ITEMS.find(i => i.href === pathname)?.label`. Control Center icon toggles a local `useState` boolean showing a small glass dropdown with the sound toggle (reuse `isSoundEnabled`/`toggleSound` from `LayoutContext`) and theme toggle (reuse `isDarkTheme`/`toggleTheme` from `ThemeContext`) — same icons/behavior BottomToolbar had. Spotlight icon calls `openSearch()` from `LayoutContext`. Clock: `useState<Date>` updated via `setInterval` every second (client-only, guard against SSR mismatch the same way `LeftSidebar`'s old entrance-animation guard did — render a stable placeholder on first server render, hydrate the real time in a `useEffect`).

**Modify:**
- `components/layout/AppShell.tsx` — remove `LeftSidebar` import/render and the sidebar-only backdrop logic (no sidebar left to backdrop for). Add `Wallpaper` (renders first, behind everything), `MenuBar` (non-phone branch), `ProfileWidget` (non-phone branch, gated on `pathname === "/"`).
- `contexts/LayoutContext.tsx` — remove `isSidebarOpen`, `toggleSidebar`, `closeSidebars` (confirmed via grep: only `AppShell.tsx`, `LeftSidebar.tsx`, and `useShellMetrics.ts` reference these — all three are being changed/deleted in this pass, so removal is safe).
- `lib/useShellMetrics.ts` — `contentLeft` no longer depends on `isSidebarOpen` (there's no sidebar); it becomes a plain `inset`-based margin like `contentRight` already is. Remove the now-dead `sidebarWidth`/`sidebarRightEdge`/`sidebarHiddenX` fields from `calculateShellMetrics`. `dotsLeft` (still consumed by `ScrollDots.tsx`, used only in `app/page.tsx`) simplifies the same way — no more `isSidebarOpen` branch.
- `app/about/page.tsx`, `app/dsa/page.tsx`, `app/notes/page.tsx`, `app/page.tsx`, `app/projects/page.tsx`, `app/skills/page.tsx`, `app/uses/page.tsx` — remove the `BottomToolbar` import and `<BottomToolbar />` render from each. Nothing else in these files changes; their `ml`/`mr` margin variables keep working since `contentLeft`/`contentRight` still exist as fields, just computed differently now.

## Global constraints carried over

- No component libraries — Tailwind + Framer Motion only
- Framer Motion for all animation
- Every design-system claim stays flagged `[HIG-sourced]`/`[Web adaptation]` if this spec's implementer touches `docs/design-system/*.md`
- Clock and any other client-only value must avoid SSR/hydration mismatches (existing codebase pattern: snap to a stable value on first render, update in `useEffect`)

## Explicitly out of scope (future passes)

- GitHub/LeetCode/LinkedIn widgets (that content stays reachable via `/about` for now)
- Sourcing/adding the real macOS wallpaper image (placeholder only)
- Menu bar dropdown functionality (File/Edit/View... — decorative for now)
- Real Apple-style icon set for the Dock (still using the existing dummy `/icons/*.png` mapping)

## Verification

- `npm run build` succeeds with no dangling imports (`LeftSidebar`, `BottomToolbar`, `isSidebarOpen`, `toggleSidebar`, `closeSidebars`, `sidebarWidth`, `sidebarRightEdge`, `sidebarHiddenX` all grep-clean across the repo)
- Manual check: home page shows wallpaper + ProfileWidget (top-left) + MenuBar (top) + Dock (bottom), no LeftSidebar; sub-pages (e.g. `/about`) show wallpaper + MenuBar + Dock, no ProfileWidget, no BottomToolbar
- Control Center panel opens/closes, sound + theme toggles work exactly as they did in BottomToolbar
- Spotlight icon opens the same `CommandPalette` as before
- Clock updates and shows no hydration warning in the console
