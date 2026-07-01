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
