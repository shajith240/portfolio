# Materials & Liquid Glass

> Read this before touching any surface that floats above content: the Dock, menu bar, windows, the command palette, overlays, and mobile chrome.
>
> Implementation: [`lib/liquidGlass.ts`](../../lib/liquidGlass.ts) (engine) + [`styles/glass-system.css`](../../styles/glass-system.css) (rim light, gloss, press glow; imported from `app/layout.tsx`).

## What Liquid Glass is

**[HIG-sourced]** Liquid Glass is the material Apple introduced at WWDC 2025 across iOS 26, iPadOS 26, macOS 26 "Tahoe", tvOS 26, watchOS 26 and visionOS 26. Unlike the older blur materials, it **lenses** light (bends and concentrates it) instead of scattering it. Its highlights respond to the element's geometry and move with interaction. It "illuminates from within" when touched, "starting right under your fingertips". Elements **materialize** instead of fading in. ([Meet Liquid Glass, WWDC25-219](https://developer.apple.com/videos/play/wwdc2025/219/))

This portfolio is *inspired by* that material. It doesn't reimplement Apple's private renderer. Every rule below is flagged **[HIG-sourced]** (Apple's own guidance or behaviour) or **[Web adaptation]** (our approach, or a community technique, for doing it in a browser).

## Where to use it

**[HIG-sourced]** ([HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials))
- Liquid Glass belongs to the **controls/navigation layer** that floats above content. Don't use it in the content layer.
- Use it **sparingly**. Stacking many glass surfaces dilutes the effect and hurts legibility.
- **Regular** glass (the default) adapts to stay legible behind text and icons. **Clear** glass is more transparent and only belongs over media-rich backgrounds that already have enough contrast.

**[Web adaptation]** Current engine users: Dock, menu bar (bar and dropdowns), windows, command palette, the GitHub heatmap widget, and the mobile home-screen dock, pill and lock-screen buttons. The heatmap widget is the one surface sitting close to the content layer, so don't add more like it. Everything on this site is the Regular variant; there is no Clear tier.

## Concentricity

**[HIG-sourced]** A glass element's corner radius nests concentrically inside its container's radius:

```
containerRadius = childRadius + childInsetFromContainerEdge
```

A pill inset 8px inside a 24px-radius container gets a 16px radius. Mismatched radii are the quickest way to make this look like generic glassmorphism.

**[Web adaptation]** The engine's `radius` option **must equal the element's CSS `border-radius`**. The displacement map is built for that shape, so a mismatch puts the lens band in the wrong place.

## Thickness scales with size

**[HIG-sourced]** Larger glass behaves as if it were thicker, with deeper shadows and more pronounced lensing (WWDC25-219).

**[Web adaptation]** In the engine, thickness means `bezel` (how wide the refracting rim band is) and `strength` (how hard it bends). For example, the Dock uses `bezel: 22, strength: 0.7`, windows use `12 / 0.55` and menu-bar dropdowns use `8 / 0.55`.

## Scroll edge effect

**[HIG-sourced]** Where scrolling content passes under a floating glass element, separate the two with a soft fade or, if the fade doesn't give enough contrast, a harder backing.

**[Web adaptation]** Use `mask-image: linear-gradient(...)` on the scrolling content's edge.

## The layers

**[Web adaptation]** One glass surface is built from four layers:

1. **Refraction (Chromium only).** The surface is modelled as a glass slab whose rim curves off with a convex **squircle** profile, `(1 − (1 − t)^4)^(1/4)`. Light through that bezel bends by **Snell's law (n = 1.5)** along the edge normal. Each pixel samples *inward*, so content just inside the rim is pulled in and magnified. The flat interior isn't displaced. The field is baked into a canvas displacement map (R = x, G = y, 128 = none) and applied as an SVG `feDisplacementMap` inside `backdrop-filter`. The filter uses `color-interpolation-filters="sRGB"`, because 128 only means "zero displacement" in sRGB. This approach follows [kube.io](https://kube.io/blog/liquid-glass-css-svg/).
   - **Blur runs before the lens:** `blur(b) url(#lgN) saturate() brightness() contrast()`. Backdrop-filter functions apply in order, so the bend stays crisp and doesn't get smeared by the blur.
   - The blur is light by design (2–5px), not 16–24px frost. Lensing provides the separation from content.
2. **Material fill (all browsers).** A `tintColor`/`tint` wash plus an **adaptive** wash of the wallpaper's average colour (`--wallpaper-tint-rgb`, kept up to date by `useWallpaper`). The fill reads the CSS variable directly, so changing the wallpaper re-tints every surface immediately.
3. **Light — a coloured glint, never a white stroke.** **[HIG-sourced]** Apple describes highlights that "respond to geometry" and a material that "reflects color and light of surrounding content" ([WWDC25-219](https://developer.apple.com/videos/play/wwdc2025/219/)); it never draws an outline. **[Web adaptation]** Two parts:
   - **Colour rim (Chromium, in the filter).** Alongside the displacement map the engine bakes a *specular mask*: a thin band (≈1.5px falloff) plus a faint sheen across the bezel, weighted by |n·L| for a fixed key light up and to the left (−60°). The filter saturates the refracted backdrop (`feColorMatrix saturate 2.6`), keeps only the masked rim of it (`feComposite in`), scales it to 55% and `screen`-blends it back. The edge therefore glows in the colour of whatever is behind it: blue over blue, warm over red. This follows kube.io's specular-saturation technique.
   - **Static glint (all browsers, CSS).** A 1px ring (`mask-composite: exclude`) lit by a `conic-gradient` from the same fixed −60° key light (`--lg-angle`). It is a short arc of ~0.2 alpha where the light enters, a ~0.06 return opposite, and **zero** along the flanks, blended with `mix-blend-mode: plus-lighter`, so it adds light to the backdrop rather than painting white. An earlier version kept ~0.5 white around the whole ring and read as a drawn white line; don't go back there.
   - **The light does not follow a hovering cursor.** **[HIG-sourced]** Apple's lights "move in space" *on interactions* ([WWDC25-219](https://developer.apple.com/videos/play/wwdc2025/219/)), and on macOS widgets are content, not interactive glass. **[Web adaptation]** An earlier version aimed the rim at the pointer, which read as a border sliding around a widget on hover. Light now moves only through the press response (layer 4).
   - There is also a faint 165° top gloss, a very soft inset lip (0.07) and shade, and drop shadows on `.liquid-glass`. Nothing runs per frame while the pointer moves.
4. **Press (all browsers).** On pointerdown, a radial glow spreads from the touch point (`--lg-gx/gy`, `--lg-gr`, `--lg-glow`, blended with `screen` so it only adds light). Refraction **energizes**: the displacement scale springs from resting 0.85 to 1.15, then back. In `"squish"` mode the element also swells and squashes toward the finger, then wobbles back. The swell is 1.12 for controls up to 48px, 1.07 up to 80px and 1.035 above that, using CSS `scale`, which composes with Framer Motion's `transform`.

**[HIG-sourced]** Interactive glass reacts to touch and pointer ([Applying Liquid Glass to custom views](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views)). `.interactive()` adds "scaling, bouncing, and shimmering" ([WWDC25-323](https://developer.apple.com/videos/play/wwdc2025/323/)).

**[Web adaptation]** The springs use SwiftUI's own presets, expressed with Framer Motion's `visualDuration`/`bounce`, which use the same parameters ([SwiftUI `.bouncy`](https://developer.apple.com/documentation/swiftui/animation/bouncy(duration:extrabounce:))):

| Moment | Spring | Matches |
|---|---|---|
| Press in | `visualDuration 0.22, bounce 0.15` | `.snappy` |
| Release | `visualDuration 0.5, bounce 0.3` (the overshoot is the wobble) | `.bouncy` |
| Materialize | `visualDuration 0.45, bounce 0.2`, refraction 0 → 0.85 on first apply | "materialize, don't fade" |

## Engine API

```ts
import { useLiquidGlass, applyLiquidGlass, releaseLiquidGlass } from "@/lib/liquidGlass";

// Hook: applies synchronously in a layout effect, re-applies on resize (debounced 120ms)
const ref = useLiquidGlass<HTMLDivElement>({ radius: 18, bezel: 9, press: "squish" });
<div ref={ref} className="liquid-glass" style={{ borderRadius: 18 }} />

// Imperative: for elements you mount/measure yourself (Dock, Window, palette)
applyLiquidGlass(el, opts); /* … */ releaseLiquidGlass(el);
```

| Option | Default | Meaning |
|---|---|---|
| `radius` | `24` | px. **Must match** the element's `border-radius`. |
| `bezel` | `14` | px width of the curved rim band that refracts |
| `strength` | `0.6` | 0..1, slab thickness relative to the bezel (how hard the rim lenses) |
| `refraction` | `1` | multiplier on the displacement scale |
| `blur` | `4` | px backdrop blur (Chromium; others get `blur + 10`) |
| `saturate` / `brightness` / `contrast` | `1.5` / `0.9` / `1.05` | backdrop colour grade; `brightness < 1` darkens for dark glass |
| `tint` / `tintColor` | `0.15` / `"18,20,28"` | fill alpha and `"r,g,b"` |
| `adaptive` | `0.1` | alpha of the wallpaper-colour wash; `0` disables |
| `press` | `"glow"` | `"squish"` \| `"glow"` \| `false` (see below) |
| `stretch` | — | `"x"` for elements whose width animates every frame |
| `observe` (hook only) | `true` | `false` re-applies only on window resize, for elements that animate their own size without `stretch` |

**[Web adaptation]** **`stretch: "x"`** (used by the Dock while it magnifies): rebuilding a canvas map every frame would cause jank. Instead, the map is built once as a left cap, a 1px middle column and a right cap, on a neutral `feFlood` base. A `ResizeObserver` then re-lays them out with attribute writes alone. This is exact, because displacement doesn't change along a straight edge.

Other details: maps are cached (LRU, 24 entries) by size and shape. Filters live in a single hidden `<svg id="lg-engine-defs">` as `#lg1`, `#lg2`, …. Size comes from `offsetWidth/Height` rather than `getBoundingClientRect`, so a surface applied mid-entrance-animation gets a map for its laid-out size and not its scaled size.

### Choosing a press mode

**[Web adaptation]**
- **`"squish"`**: small, tappable controls that act like buttons (mobile home pill, lock-screen buttons). Our reading of Apple's `.interactive()` scale and bounce.
- **`"glow"`** (default): large panels and anything that shouldn't change size under the finger (Dock, windows, menu bar, command palette). Scaling a big panel or the Dock reads as a glitch, so these only light up and energize.
- **`false`**: surfaces that aren't interactive.

## Browser tiers

**[Web adaptation]**

| Tier | Who | Backdrop |
|---|---|---|
| Pre-engine (first sub-frame) | everyone | `.liquid-glass` CSS base: `blur(8px) saturate(1.5) brightness(0.9) contrast(1.05)` plus the tint. It's the same material family, so the upgrade isn't visible. |
| Refraction | Chromium (detected via `navigator.userAgentData.brands` including `"Chromium"`) | `blur(b) url(#lgN) saturate brightness contrast` |
| Frosted fallback | Safari, Firefox, Chromium without UA Client Hints (non-secure origins), or if the canvas is unavailable | `blur(b + 10px) saturate brightness contrast`. The denser frost makes up for the missing lens; the light and press layers still apply. |

Why detection is explicit: WebKit can't use an SVG filter as a backdrop-filter ([WebKit 245510](https://bugs.webkit.org/show_bug.cgi?id=245510)). Firefox *parses* `backdrop-filter: url(...)` and then **drops the whole backdrop-filter, blur included** ([Mozilla 1961378](https://bugzilla.mozilla.org/show_bug.cgi?id=1961378)). So `@supports` and computed-style checks give the wrong answer, and you should never feature-detect with them.

## Accessibility

**[HIG-sourced]** Apple's Reduce Transparency, Increase Contrast and Reduce Motion settings all change Liquid Glass. Honour all three.

**[Web adaptation]**
- `prefers-reduced-transparency: reduce` makes `.lg-surface` / `.liquid-glass` a near-opaque `rgba(28, 28, 32, 0.92)` slab with no backdrop-filter at all. `!important` is needed to beat the engine's inline styles. Only Chromium supports this media query today.
- `prefers-contrast: more` turns the rim from a pointer-lit gradient into a solid 1.5px `rgba(255,255,255,0.6)` ring.
- `prefers-reduced-motion: reduce` turns off squish and energize, skips the materialize spring (refraction starts at rest), and shortens the press glow to 0.12s. The pointer-following rim stays, because it's a light change and not movement.

## Composition rules

**[Web adaptation]** These rules follow from the **Backdrop Root** in [Filter Effects 2](https://drafts.csswg.org/filter-effects-2/). An element's `backdrop-filter` only sees content up to its nearest backdrop-root ancestor. Any ancestor with `opacity < 1`, `filter`, `mask`, `clip-path`, `backdrop-filter` or `mix-blend-mode` (or `will-change` on one of those) is a backdrop root.

- **Never fade an ancestor of a glass element.** While a parent animates `opacity`, the glass inside samples an empty backdrop and goes flat or blank. Animate the glass element itself (scale or y, and its own opacity), or materialize it.
- **Never nest glass in glass.** The inner surface would refract only the outer surface's contents and not the wallpaper, which also means double lensing.
- **Opaque content over glass:** if a surface's content covers the `.liquid-glass` pseudo-elements (window title bar and body, Finder), add a `<div className="lg-rim" />` sibling *above* the content with a matching `border-radius`. It inherits the `--lg-*` variables and redraws the rim, gloss and glow.
- Children of `.liquid-glass` are put at `z-index: 2` above the rim and gloss (`z-index: 1`). Don't give them a lower stacking context.

## CSS variables

| Variable | Set by | Meaning |
|---|---|---|
| `--lg-angle` | `.lg-surface` (CSS, fixed) | direction of the key light, `-60deg` (up-left); `0deg` = up, clockwise |
| `--lg-glow` | engine (press) | 0..1, press illumination strength |
| `--lg-gx` / `--lg-gy` | engine (press) | where the press landed (%) |
| `--lg-gr` | engine (press) | how far the glow has spread |
| `--wallpaper-tint-rgb` | `useWallpaper` | average wallpaper colour for the adaptive wash (default `120, 120, 130`) |

Classes: `.lg-surface` is added by the engine (it scopes the variables and the accessibility overrides), `.liquid-glass` provides the base material, rim, gloss and shadows, and `.lg-rim` is the rim overlay for content-covered surfaces.

### Legacy frosted tokens

**[Web adaptation]** `styles/globals-tokens.css` still defines `--glass-{thin,regular,thick}-bg`, `--glass-border`, `--glass-blur-{thin,regular,thick}` and `--glass-saturate`. They're used by plain frosted surfaces that don't use the engine (context menu, wallpaper picker, About widget, Finder, widget chrome). They're fine for small, transient UI. Any new floating chrome should use the engine instead.

## Sources

- [Meet Liquid Glass — WWDC25-219](https://developer.apple.com/videos/play/wwdc2025/219/)
- [Build a SwiftUI app with the new design — WWDC25-323](https://developer.apple.com/videos/play/wwdc2025/323/)
- [Materials — Apple HIG](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Applying Liquid Glass to custom views — SwiftUI](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views)
- [`Animation.bouncy(duration:extraBounce:)` — SwiftUI](https://developer.apple.com/documentation/swiftui/animation/bouncy(duration:extrabounce:))
- [Liquid Glass in the Browser: Refraction with CSS and SVG — kube.io](https://kube.io/blog/liquid-glass-css-svg/)
- [WebKit bug 245510](https://bugs.webkit.org/show_bug.cgi?id=245510) · [Mozilla bug 1961378](https://bugzilla.mozilla.org/show_bug.cgi?id=1961378)
- [Filter Effects Module Level 2 — Backdrop Root](https://drafts.csswg.org/filter-effects-2/)
