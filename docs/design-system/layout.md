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
| Dock | Floating bottom-center pill nav — built for phone in `MobileTabBar.tsx`; a second Dock instance is the primary nav on desktop/tablet, replacing the old fixed right-hand nav panel |
| Translucent sidebar | `LeftSidebar` — currently opaque `--bg-card`; upgrade to `--glass-regular-bg` from `materials-glass.md` when the sidebar is next touched |
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
