# Boot + Login Sequence

**Date:** 2026-07-01
**Status:** Approved for implementation

## Context

First visual thing a visitor sees, before the desktop shell (Wallpaper/MenuBar/Dock/widgets) ever appears. Three stages: boot (logo + progress), login (blurred wallpaper, clock, click-to-unlock account picker), then reveal (existing entrance animations on MenuBar/Dock/widgets play naturally once the overlay is gone — nothing new needed there).

Research corrected the original assumption: real macOS (Sonoma onward, carrying into Sequoia/Tahoe) moved the login screen away from "everything centered" to a large clock top-center and a compact account picker bottom-center, giving the wallpaper more visual space. The blur behind it is macOS's actual default "blurred snapshot" behavior, confirmed via Apple-focused sources (see Sources section). This spec follows the *current* layout, not the older centered one.

## Decisions from brainstorming

- Plays once per browser session (`sessionStorage`, not `localStorage` — replays on a fresh session, not every reload within one)
- Login requires clicking the account photo to proceed (not automatic)
- Click-anywhere-to-skip during the boot stage (not during login — the click *is* the login's only interaction, there's nothing to skip past)
- Renders for both desktop and phone layouts (first-impression moment, not tied to desktop-only widgets)
- Never renders inside a window's iframe (`?__window=1` check, same pattern `AppShell` already uses)
- Defaults to *showing* on first render (matches server, no hydration mismatch) — a `useEffect` hides it immediately if the session flag is already set. Biased toward correctly showing the sequence on a first visit rather than risking a flash of the desktop first.

## Stage 1 — Boot screen

**[Web adaptation]** No literal Apple logo (trademark) — a fresh, original monogram: a geometric "S" glyph (Shajith), accent orange (`#FF4500`), roughly 48px, centered. The old sidebar had a similar orange "/" mark; that component is gone, this is a new, unrelated glyph.

- Full black background (`#000000`)
- Monogram centered, roughly 40% up the viewport (matches real macOS's logo position — slightly above center, not dead-center, to leave room for the progress bar below it)
- Progress bar: 200px wide, 4px tall, fully rounded, track color `rgba(255,255,255,0.15)`, fill `#FFFFFF` (real macOS boot bar is white/light, not accent-colored) — animates 0→100% width over 2.2s, `ease-out` (starts faster, settles at the end — matches the real bar's non-linear fill)
- No percentage text, no spinner — just the bar, matching real macOS exactly
- **[HIG-sourced]** Font for any boot-stage text (there isn't any beyond the monogram, but documented here for completeness): none needed
- Click/tap anywhere during this stage jumps straight to Stage 2, canceling the in-flight progress animation

## Stage 2 — Login screen

**[HIG-sourced, corrected from initial assumption]** Matches macOS Sonoma+'s actual layout:

- **Background**: the visitor's current wallpaper selection (same `useWallpaper()` hook / `public/wallpapers/` already built for the desktop), `filter: blur(40px) saturate(120%)` plus a `rgba(0,0,0,0.25)` dark overlay for text contrast — approximates the real "blurred snapshot" look
- **Top-center, ~12% down from the top**: large clock —
  - Time: `clamp(64px, 9vw, 96px)` font size, weight 200 (thin — matches the real clock's reported "large, thin-ish" numeral style), font stack `-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif` (same stack already established in `docs/design-system/typography.md`), tabular/monospaced numeral rendering (`font-variant-numeric: tabular-nums` so it doesn't jiggle width as digits change)
  - Day + date below the time: e.g. "Wednesday, July 1", `clamp(15px, 1.6vw, 18px)`, weight 500, `rgba(255,255,255,0.85)`
  - Both update live via `setInterval` (same hydration-safe pattern as `MenuBar`'s clock — render nothing until mounted, then tick)
- **Bottom-center, ~14% up from the bottom**: the account picker —
  - Circular photo, 64px diameter (small — matches the real "much smaller and neater than before" sizing), `/photos/my_photo.jpeg`, subtle `0 4px 16px rgba(0,0,0,0.4)` shadow, thin `1px solid rgba(255,255,255,0.3)` ring
  - Name below the photo: "Shajith Bathina", 15px, weight 600, white
  - A faint hint below that, opacity-pulsing (`animate: opacity [0.4, 0.8, 0.4]`, 2.5s loop) — "Click to continue" — since there's no real password field, this substitutes for the "click your icon to log in" affordance without pretending to be a real auth prompt
- **Click behavior**: clicking the photo triggers `whileTap`-style press (scale to 0.94), then the whole login layer fades + scales out (`opacity 1→0`, `scale 1→1.04`, 350ms) revealing the desktop underneath, which plays its own already-built entrance animations

## Architecture

- `components/boot/BootScreen.tsx` — Stage 1, receives `onSkip`/`onComplete`
- `components/boot/LoginScreen.tsx` — Stage 2, receives `onUnlock`
- `components/boot/BootSequence.tsx` — orchestrator: `stage` state (`"boot" | "login" | "done"`), the `sessionStorage` check/write, renders nothing once `"done"`
- Mounted once in `AppShell`, only in the non-embedded branch, before/above everything else (highest z-index — 9999, clearly above MenuBar's 200 and the window layer)

## Global constraints carried over

- Framer Motion for all animation
- `-apple-system` font stack (already the project standard, see `docs/design-system/typography.md`)
- SSR/hydration-safe patterns for anything reading `sessionStorage`/`window`/`Date`
- No literal Apple trademarks/logos (project hard rule)

## Explicitly out of scope

- Multiple user accounts / account switching
- A real password field or any actual authentication
- Customizing which wallpaper shows on the login screen independently of the desktop's current selection

## Verification

- `npm run build` succeeds
- Fresh session (cleared sessionStorage): boot plays, click-to-skip works, login screen shows the correct current wallpaper (blurred) with live clock, clicking photo reveals desktop
- Refreshing within the same session: skips straight to desktop, no replay
- Opening a Dock window (iframe): boot sequence never appears inside it
- No console errors, no hydration warnings, clock uses tabular numerals (doesn't jitter)

## Sources

- [macOS Sonoma: How to customize and navigate the new login screen — Macworld](https://www.macworld.com/article/1981602/macos-sonoma-lock-screen-settigns-clock-user-accounts.html)
- [Login position at bottom — MacRumors Forums](https://forums.macrumors.com/threads/login-position-at-bottom-oh-please-at-least-let-me-change.2410441/)
- [Disabling login window clock display on macOS Sonoma — Der Flounder](https://derflounder.wordpress.com/2024/03/05/disabling-login-window-clock-display-on-macos-sonoma/)
- [Does anyone have a solution to the Sonoma blurry login background — Apple Community](https://discussions.apple.com/thread/255201592)
