"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { animate } from "framer-motion";

/* Liquid Glass engine — the material behind every glass surface.

   Rebuilt against Apple's own description of the material (WWDC25
   "Meet Liquid Glass": it *lenses* — "bends, shapes, and concentrates
   light" — rather than scattering it like the old frosted materials)
   and the best web reverse-engineering of it (kube.io, "Liquid Glass
   in the browser"). Four layers, each doing one job:

   1. REFRACTION (Chromium only). Each surface is modelled as a glass
      slab whose rim rounds off with a convex squircle profile. Light
      passing through that curved bezel bends by Snell's law (n = 1.5)
      ALONG THE EDGE NORMAL, so content just inside the rim is pulled
      inward and magnified — the "lens" edge that reads as glass. The
      field is baked to a displacement map (R = x, G = y, 128 = none)
      and applied through an SVG feDisplacementMap as a
      backdrop-filter. The flat interior is left untouched.
      Blur runs BEFORE the bend (CSS backdrop-filter functions apply
      in order), so the lensing stays crisp instead of being smeared.

   2. LIGHT. A FIXED key light, up and to the left. On Chromium the
      filter lifts a thin, saturated rim of the backdrop itself (the
      edge glows in the colour behind it); styles/glass-system.css
      adds a faint static glint on every browser. It deliberately does
      NOT track a hovering pointer: Apple's lights move around the
      material on interaction (touch, drag), and on macOS a widget's
      edge never shimmers as the cursor passes — a hover-tracking rim
      read as a border sliding around.

   3. PRESS (all browsers). Apple: glass "responds to interaction by
      instantly flexing and energizing with light". On pointerdown the
      surface glows from the press point outward (--lg-glow/--lg-gr),
      the refraction energizes, and — for control-sized surfaces —
      the element swells and squashes toward the finger, then wobbles
      back on a bouncy spring when released (CSS `scale`, which
      composes with Framer Motion's own `transform` instead of
      fighting it).

   4. MATERIALIZE. A surface doesn't fade in; its lensing springs up
      from flat on first application.

   Safari (WebKit 245510) and Firefox (Mozilla 1961378) can't use an
   SVG filter as a backdrop-filter — and Firefox *parses* it, then
   silently drops the whole backdrop-filter, blur included, so
   @supports / computed-style checks lie. Engine detection is explicit
   (UA Client Hints exist only in Chromium) and those browsers get a
   stronger frosted blur with the same light and press layers. */

export interface LiquidGlassOptions {
  radius?: number; // px — must match the element's border-radius
  bezel?: number; // px — width of the curved rim band that refracts
  strength?: number; // 0..1 — slab thickness relative to the bezel (how hard the rim lenses)
  refraction?: number; // multiplier on the displacement
  blur?: number; // px backdrop blur — real Liquid Glass is light (2–6px), not frosted (16–24px)
  saturate?: number;
  brightness?: number; // <1 darkens (dark-mode glass), >1 lightens
  contrast?: number;
  tint?: number; // fill alpha
  tintColor?: string; // "r,g,b"
  // Adaptive color: the material picks up a tint of what's behind it —
  // the desktop's backdrop colour (--backdrop-tint-rgb in
  // styles/glass-system.css). 0 disables.
  adaptive?: number;
  // Press response. "squish": swell + gel squash toward the press
  // point + bouncy release (control-sized surfaces). "glow": light and
  // energize only (large panels, the Dock — Apple doesn't scale
  // those). false: no press response at all.
  press?: "squish" | "glow" | false;
  // "x": the element resizes horizontally every frame (the Dock while
  // magnifying). The map is built once as left cap + 1px middle column
  // + right cap and re-laid-out with attribute writes per frame —
  // exact, because displacement is constant along a straight edge.
  stretch?: "x";
  // Re-apply (debounced) whenever the element's size settles — for
  // surfaces attached outside useLiquidGlass whose height follows
  // their content (the Spotlight panel growing with results).
  autoResize?: boolean;
  // Where the press variables are written. "parent" for a glass LAYER
  // whose visible rim/glow is a sibling .lg-rim overlay (windows):
  // writing on the shared parent lets both inherit them.
  lightHost?: "self" | "parent";
}

const DEFAULTS = {
  radius: 24,
  bezel: 14,
  strength: 0.6,
  refraction: 1,
  blur: 4,
  saturate: 1.5,
  brightness: 0.9,
  contrast: 1.05,
  tint: 0.15,
  tintColor: "18,20,28",
  adaptive: 0.1,
  press: "glow" as "squish" | "glow" | false,
};

type Resolved = typeof DEFAULTS & Pick<LiquidGlassOptions, "stretch" | "autoResize" | "lightHost">;

const SVG_NS = "http://www.w3.org/2000/svg";
const IOR = 1.5;
const LUT_SIZE = 128;

// Press springs, in SwiftUI's own terms (Framer's visualDuration/bounce
// is the same parameterisation): press-in ≈ .snappy, release ≈ .bouncy
// — the release overshoot IS the gel wobble.
const PRESS_IN = { type: "spring", visualDuration: 0.22, bounce: 0.15 } as const;
const RELEASE = { type: "spring", visualDuration: 0.5, bounce: 0.3 } as const;
const MATERIALIZE = { type: "spring", visualDuration: 0.45, bounce: 0.2 } as const;
// Refraction "energy": resting lensing sits a little below full and
// springs up under the finger (kube.io: 0.8 → 1.0).
const REST_ENERGY = 0.85;
const PRESSED_ENERGY = 1.15;

let idCounter = 0;
const ID_PREFIX = `lg${Math.random().toString(36).slice(2, 6)}-`;

/* ── Engine detection ───────────────────────────────────────────── */

let refractionSupport: boolean | null = null;
function supportsRefraction() {
  if (refractionSupport !== null) return refractionSupport;
  const brands = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData?.brands;
  refractionSupport = !!brands?.some((b) => b.brand === "Chromium");
  return refractionSupport;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── Displacement map ───────────────────────────────────────────── */

// Convex squircle surface profile across the bezel: 0 at the outer
// rim → 1 where the bezel meets the flat top (kube.io's Apple-like
// profile; a plain circle reads too "bubbly").
const squircle = (t: number) => Math.pow(1 - Math.pow(1 - t, 4), 0.25);

// Lateral shift (px, pointing inward) at each step across the bezel,
// from Snell refraction of a vertical ray through a slab whose top
// surface follows the profile.
function bezelLUT(bezel: number, thickness: number) {
  const lut = new Float32Array(LUT_SIZE);
  const e = 1e-3;
  let max = 0;
  for (let i = 0; i < LUT_SIZE; i++) {
    const t = i / (LUT_SIZE - 1);
    const slope =
      ((squircle(Math.min(1, t + e)) - squircle(Math.max(0, t - e))) / (Math.min(1, t + e) - Math.max(0, t - e))) *
      (thickness / bezel);
    const incident = Math.atan(slope);
    const refracted = Math.asin(Math.sin(incident) / IOR);
    const shift = thickness * squircle(t) * Math.tan(incident - refracted);
    lut[i] = shift;
    if (shift > max) max = shift;
  }
  return { lut, max: max || 1 };
}

interface BuiltMap {
  url: string; // full map, or the left cap in stretch mode
  mid?: string; // stretch mode: 1px middle column
  right?: string; // stretch mode: right cap
  // Specular rim mask (white, intensity in alpha), sliced the same way.
  spec: string;
  specMid?: string;
  specRight?: string;
  cap: number; // stretch mode: cap width
  maxShift: number;
}

// Where the light sits for the baked rim (screen coords, y down):
// up and to the left, ~-60° — kube.io's reference angle, and the
// top-left key light Apple's own glass reads with.
const LIGHT_X = -0.5;
const LIGHT_Y = -0.866;
// Specular band: falls off over ~1.5px from the rim, plus a faint
// sheen across the rest of the bezel.
const SPEC_FALLOFF = 1.5;

const mapCache = new Map<string, BuiltMap>();
const MAP_CACHE_LIMIT = 24;

function buildMap(width: number, height: number, radius: number, bezelIn: number, strength: number, stretch?: "x") {
  const h = Math.max(2, Math.round(height));
  const fullW = Math.max(2, Math.round(width));
  const r0 = Math.min(radius, h / 2, fullW / 2);
  const cap = Math.ceil(Math.max(r0, Math.min(bezelIn, h / 2)));
  // Stretch mode only ever needs a map just wide enough for both caps
  // plus one representative column of straight edge.
  const w = stretch === "x" ? cap * 2 + 1 : fullW;
  const key = `${w}x${h}r${radius}b${bezelIn}s${strength}${stretch ?? ""}`;
  const hit = mapCache.get(key);
  if (hit) {
    mapCache.delete(key);
    mapCache.set(key, hit);
    return hit;
  }

  const hw = w / 2;
  const hh = h / 2;
  const r = Math.min(radius, hw, hh);
  const bezel = Math.max(1, Math.min(bezelIn, hw, hh));
  // Slab thickness relative to the bezel: thicker glass bends further,
  // spreading the lens band visibly inward from the rim (strength 0.7
  // ≈ a ~25px shift on a 22px bezel — the Dock's scale).
  const { lut, max } = bezelLUT(bezel, bezel * strength * 4);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const img = ctx.createImageData(w, h);
  const data = img.data;
  // Neutral everywhere first; only the bezel band is computed.
  for (let p = 0; p < data.length; p += 4) {
    data[p] = 128;
    data[p + 1] = 128;
    data[p + 2] = 128;
    data[p + 3] = 255;
  }
  const write = (px: number, py: number, vx: number, vy: number) => {
    const i = (py * w + px) * 4;
    data[i] = Math.round(128 + vx * 127);
    data[i + 1] = Math.round(128 + vy * 127);
  };
  // Specular rim mask. Not a white line: the filter uses it to pick out
  // a thin rim of the refracted backdrop, saturate it and screen it
  // back — so the edge glows in the colour of whatever is behind it,
  // brightest where the rim faces the light (and, weaker, where light
  // exits on the far side), nearly gone along the flanks.
  const specImg = ctx.createImageData(w, h); // transparent
  const spec = specImg.data;
  const writeSpec = (px: number, py: number, onx: number, ony: number, depth: number) => {
    const facing = Math.abs(onx * LIGHT_X + ony * LIGHT_Y); // |n·L|
    const band = Math.exp(-depth / SPEC_FALLOFF) + 0.12 * Math.pow(1 - depth / bezel, 2);
    const a = Math.min(1, band * (0.12 + 0.88 * facing * facing));
    const i = (py * w + px) * 4;
    spec[i] = 255;
    spec[i + 1] = 255;
    spec[i + 2] = 255;
    spec[i + 3] = Math.round(a * 255);
  };

  // One quadrant, mirrored into the other three with sign flips.
  const qw = Math.ceil(hw);
  const qh = Math.ceil(hh);
  for (let py = 0; py < qh; py++) {
    const ay = hh - (py + 0.5); // distance from centre, ≥ 0
    for (let px = 0; px < qw; px++) {
      const ax = hw - (px + 0.5);
      const qx = ax - (hw - r);
      const qy = ay - (hh - r);
      let depth: number; // distance inward from the rim
      let nx: number; // outward normal, in |x|,|y| space
      let ny: number;
      if (qx > 0 && qy > 0) {
        const len = Math.hypot(qx, qy);
        depth = r - len;
        nx = qx / len;
        ny = qy / len;
      } else {
        const dx = hw - ax;
        const dy = hh - ay;
        depth = Math.min(dx, dy);
        // Where both edges' bands overlap (a corner whose radius is
        // smaller than the bezel — the Dock), blend the two normals by
        // how deep into each band the pixel sits, instead of flipping
        // abruptly on the diagonal (a visible seam in the lens).
        const a = Math.max(0, bezel - dx);
        const b = Math.max(0, bezel - dy);
        if (a > 0 && b > 0) {
          const len = Math.hypot(a, b);
          nx = a / len;
          ny = b / len;
        } else if (dx < dy) {
          nx = 1;
          ny = 0;
        } else {
          nx = 0;
          ny = 1;
        }
      }
      if (depth < 0 || depth >= bezel) continue;
      const mag = lut[Math.min(LUT_SIZE - 1, Math.floor((depth / bezel) * (LUT_SIZE - 1)))] / max;
      // Sample INWARD (opposite the outward normal): the convex rim
      // converges light, magnifying what's just inside it.
      const vx = nx * mag;
      const vy = ny * mag;
      const mx = w - 1 - px;
      const my = h - 1 - py;
      write(px, py, vx, vy); // top-left: outward is (-,-) → inward (+,+)
      write(mx, py, -vx, vy);
      write(px, my, vx, -vy);
      write(mx, my, -vx, -vy);
      // The light isn't symmetric, so each quadrant gets its own
      // true outward normal for the specular term.
      writeSpec(px, py, -nx, -ny, depth);
      writeSpec(mx, py, nx, -ny, depth);
      writeSpec(px, my, -nx, ny, depth);
      writeSpec(mx, my, nx, ny, depth);
    }
  }
  ctx.putImageData(img, 0, 0);
  const specCanvas = document.createElement("canvas");
  specCanvas.width = w;
  specCanvas.height = h;
  specCanvas.getContext("2d")?.putImageData(specImg, 0, 0);

  let built: BuiltMap;
  if (stretch === "x") {
    const slice = (source: HTMLCanvasElement, sx: number, sw: number) => {
      const c = document.createElement("canvas");
      c.width = sw;
      c.height = h;
      c.getContext("2d")?.drawImage(source, sx, 0, sw, h, 0, 0, sw, h);
      return c.toDataURL();
    };
    built = {
      url: slice(canvas, 0, cap),
      mid: slice(canvas, cap, 1),
      right: slice(canvas, cap + 1, cap),
      spec: slice(specCanvas, 0, cap),
      specMid: slice(specCanvas, cap, 1),
      specRight: slice(specCanvas, cap + 1, cap),
      cap,
      maxShift: max,
    };
  } else {
    built = { url: canvas.toDataURL(), spec: specCanvas.toDataURL(), cap: 0, maxShift: max };
  }
  mapCache.set(key, built);
  if (mapCache.size > MAP_CACHE_LIMIT) mapCache.delete(mapCache.keys().next().value as string);
  return built;
}

/* ── Per-element state ──────────────────────────────────────────── */

interface GlassState {
  id: string;
  opts: Resolved;
  filter: SVGFilterElement | null;
  disp: SVGFEDisplacementMapElement | null;
  images: SVGFEImageElement[];
  specImages: SVGFEImageElement[];
  cap: number;
  maxShift: number;
  energy: number;
  energyAnim?: { stop(): void };
  scaleAnim?: { stop(): void };
  glowAnim?: { stop(): void };
  stretchObserver?: ResizeObserver;
  resizeObserver?: ResizeObserver;
  resizeTimer?: ReturnType<typeof setTimeout>;
  retryRaf?: number;
  retries?: number;
  mapKey?: string;
  lightEl: HTMLElement;
  sx: number;
  sy: number;
  endPress?: () => void;
  onPointerDown?: (e: PointerEvent) => void;
}

interface LGElement extends HTMLElement {
  __lg?: GlassState;
}

function ensureDefs(): SVGDefsElement {
  let svg = document.getElementById("lg-engine-defs") as SVGSVGElement | null;
  if (!svg) {
    svg = document.createElementNS(SVG_NS, "svg");
    svg.id = "lg-engine-defs";
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "absolute";
    svg.setAttribute("aria-hidden", "true");
    svg.appendChild(document.createElementNS(SVG_NS, "defs"));
    document.body.appendChild(svg);
  }
  return svg.querySelector("defs") as SVGDefsElement;
}

function setDispScale(state: GlassState) {
  state.disp?.setAttribute("scale", String(2 * state.maxShift * state.opts.refraction * state.energy));
}

function animateEnergy(state: GlassState, to: number, transition: object) {
  state.energyAnim?.stop();
  if (!state.disp) {
    state.energy = to;
    return;
  }
  state.energyAnim = animate(state.energy, to, {
    ...transition,
    onUpdate: (v: number) => {
      state.energy = v;
      setDispScale(state);
    },
  });
}

// Stretch mode: lay the left cap / middle column / right cap out for
// the element's current width. Attribute writes only — no map rebuild.
// Narrower than two caps (never the Dock in practice), the caps share
// the width half and half rather than overlapping.
function layoutStretch(el: HTMLElement, state: GlassState) {
  if (state.images.length !== 3) return;
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const capW = Math.min(state.cap, w / 2);
  const midW = Math.max(0, w - capW * 2);
  for (const [left, mid, right] of [state.images, state.specImages]) {
    if (!left) continue;
    left.setAttribute("width", String(capW));
    left.setAttribute("height", String(h));
    mid.setAttribute("x", String(capW));
    mid.setAttribute("width", String(midW));
    mid.setAttribute("height", String(h));
    right.setAttribute("x", String(w - capW));
    right.setAttribute("width", String(capW));
    right.setAttribute("height", String(h));
  }
}

function fe<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function feImage(result: string) {
  return fe("feImage", { y: "0", x: "0", preserveAspectRatio: "none", result });
}

// Three image slices merged over a flat base into one `result`.
function slicedImages(prefix: string, base: string, result: string) {
  const flood = fe("feFlood", { "flood-color": base, "flood-opacity": base === "transparent" ? "0" : "1", result: `${prefix}base` });
  const images = [feImage(`${prefix}l`), feImage(`${prefix}m`), feImage(`${prefix}r`)];
  const merge = fe("feMerge", { result });
  for (const input of [`${prefix}base`, `${prefix}l`, `${prefix}m`, `${prefix}r`]) merge.appendChild(fe("feMergeNode", { in: input }));
  return { nodes: [flood, ...images, merge], images };
}

/* The filter, in order (the backdrop arrives already blurred — CSS
   blur() runs before url() in the backdrop-filter list):

     map  ─┐
           feDisplacementMap ── refr ─┬──────────────────────┐
                                      feColorMatrix saturate  │
     spec ─────────── feComposite in ─┘ (rim of the backdrop) │
                      feComponentTransfer (strength)          │
                      feBlend screen ─────────────────────────┘

   Created once per surface, then only ever updated IN PLACE (hrefs,
   sizes): removing and re-adding a <filter> under the same id leaves
   a frame with no filter, and relies on the browser noticing the
   swap without any style change to prompt it. */
function buildFilter(el: HTMLElement, state: GlassState, map: BuiltMap, width: number, height: number) {
  const sliced = !!(map.mid && map.right);
  if (state.filter && state.images.length !== (sliced ? 3 : 1)) {
    state.filter.remove();
    state.filter = null;
  }
  if (!state.filter) {
    // sRGB interpolation is CRUCIAL — the neutral 128 of the map is
    // only "zero displacement" in sRGB.
    const filter = fe("filter", {
      id: state.id,
      "color-interpolation-filters": "sRGB",
      x: "0",
      y: "0",
      width: "100%",
      height: "100%",
    });
    const nodes: SVGElement[] = [];
    if (sliced) {
      // Neutral base under the map slices, so a sub-pixel gap between
      // them can never read as a (maximal) displacement.
      const m = slicedImages("m", "rgb(128,128,128)", "map");
      const sp = slicedImages("s", "transparent", "spec");
      nodes.push(...m.nodes, ...sp.nodes);
      state.images = m.images;
      state.specImages = sp.images;
    } else {
      const full = feImage("map");
      const spec = feImage("spec");
      nodes.push(full, spec);
      state.images = [full];
      state.specImages = [spec];
    }
    const disp = fe("feDisplacementMap", { in: "SourceGraphic", in2: "map", xChannelSelector: "R", yChannelSelector: "G", result: "refr" });
    const saturate = fe("feColorMatrix", { in: "refr", type: "saturate", values: "2.6", result: "vivid" });
    const rim = fe("feComposite", { in: "vivid", in2: "spec", operator: "in", result: "rim" });
    const strength = fe("feComponentTransfer", { in: "rim", result: "rimA" });
    strength.appendChild(fe("feFuncA", { type: "linear", slope: "0.55" }));
    const blend = fe("feBlend", { in: "rimA", in2: "refr", mode: "screen" });
    filter.append(...nodes, disp, saturate, rim, strength, blend);
    ensureDefs().appendChild(filter);
    state.filter = filter;
    state.disp = disp as SVGFEDisplacementMapElement;
  }

  if (sliced) {
    const hrefs = [map.url, map.mid!, map.right!];
    const specHrefs = [map.spec, map.specMid!, map.specRight!];
    state.images.forEach((img, i) => img.setAttribute("href", hrefs[i]));
    state.specImages.forEach((img, i) => img.setAttribute("href", specHrefs[i]));
    state.cap = map.cap;
    layoutStretch(el, state);
  } else {
    for (const [img, href] of [
      [state.images[0], map.url],
      [state.specImages[0], map.spec],
    ] as const) {
      img.setAttribute("href", href);
      img.setAttribute("width", String(width));
      img.setAttribute("height", String(height));
    }
    state.cap = 0;
  }
  state.maxShift = map.maxShift;
  setDispScale(state);
}

/* ── Press: glow, energize, squish ─────────────────────────────── */

function writeScale(el: HTMLElement, state: GlassState) {
  el.style.scale = `${state.sx.toFixed(4)} ${state.sy.toFixed(4)}`;
}

function attachPress(el: LGElement, state: GlassState) {
  const onPointerDown = (e: PointerEvent) => {
    const mode = state.opts.press;
    if (!mode) return;
    // One press at a time (a second finger doesn't stack handlers).
    state.endPress?.();
    const box = el.getBoundingClientRect();
    const px = (e.clientX - box.left) / Math.max(1, box.width);
    const py = (e.clientY - box.top) / Math.max(1, box.height);
    const reduced = prefersReducedMotion();
    const host = state.lightEl;

    // Light radiates from under the finger (Apple: "starting right
    // under your fingertips, the glow spreads throughout the element").
    host.style.setProperty("--lg-gx", `${(px * 100).toFixed(1)}%`);
    host.style.setProperty("--lg-gy", `${(py * 100).toFixed(1)}%`);
    let glow = 0;
    state.glowAnim?.stop();
    state.glowAnim = animate(0, 1, {
      duration: reduced ? 0.12 : 0.32,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v: number) => {
        glow = v;
        host.style.setProperty("--lg-glow", v.toFixed(3));
        host.style.setProperty("--lg-gr", (v * 1.3).toFixed(3));
      },
    });
    if (!reduced) animateEnergy(state, PRESSED_ENERGY, PRESS_IN);

    const squish = mode === "squish" && !reduced;
    if (squish) {
      // Swell (glass lifts toward the finger — up, never down), with a
      // gel squash that leans toward where it was pressed. Smaller
      // controls swell more, like Apple's thumbs and buttons.
      const size = Math.min(box.width, box.height);
      const swell = size <= 48 ? 1.12 : size <= 80 ? 1.07 : 1.035;
      const nx = Math.abs(px * 2 - 1);
      const ny = Math.abs(py * 2 - 1);
      const tx = swell * (1 + 0.04 * nx - 0.02 * ny);
      const ty = swell * (1 + 0.04 * ny - 0.02 * nx);
      const fx = state.sx;
      const fy = state.sy;
      state.scaleAnim?.stop();
      state.scaleAnim = animate(0, 1, {
        ...PRESS_IN,
        onUpdate: (t: number) => {
          state.sx = fx + (tx - fx) * t;
          state.sy = fy + (ty - fy) * t;
          writeScale(el, state);
        },
      });
    }

    const release = () => {
      state.endPress = undefined;
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      // The surface was released (unmounted) mid-press — nothing to animate.
      if (el.__lg !== state) return;
      state.glowAnim?.stop();
      const glowFrom = glow;
      state.glowAnim = animate(glowFrom, 0, {
        duration: 0.45,
        ease: "easeOut",
        onUpdate: (v: number) => host.style.setProperty("--lg-glow", v.toFixed(3)),
      });
      animateEnergy(state, REST_ENERGY, RELEASE);
      if (squish) {
        state.scaleAnim?.stop();
        const fx = state.sx;
        const fy = state.sy;
        // .bouncy: the overshoot past 1 and back is the gel wobble.
        state.scaleAnim = animate(0, 1, {
          ...RELEASE,
          onUpdate: (t: number) => {
            state.sx = fx + (1 - fx) * t;
            state.sy = fy + (1 - fy) * t;
            writeScale(el, state);
          },
          onComplete: () => {
            state.sx = 1;
            state.sy = 1;
            el.style.scale = "";
          },
        });
      }
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    state.endPress = () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      state.endPress = undefined;
    };
  };
  el.addEventListener("pointerdown", onPointerDown);
  state.onPointerDown = onPointerDown;
}

/* ── Public API ─────────────────────────────────────────────────── */

const MAX_SIZE_RETRIES = 60; // ~1s of frames

export function applyLiquidGlass(element: HTMLElement, opts?: LiquidGlassOptions) {
  const el = element as LGElement;
  const o: Resolved = { ...DEFAULTS, ...opts };
  // offsetWidth/Height, NOT getBoundingClientRect: the rect includes
  // CSS transforms, and glass surfaces routinely apply while their
  // entrance animation (scale 0.98, a press swell…) is mid-flight —
  // the map must match the LAID-OUT size.
  const width = el.offsetWidth;
  const height = el.offsetHeight;
  if (width < 2 || height < 2) {
    // Not laid out yet (mounting hidden, or in a late layout pass):
    // try again over the next frames rather than staying un-glassed
    // until some unrelated resize.
    const pending = el.__lg;
    const retries = (el as LGElement & { __lgRetries?: number }).__lgRetries ?? 0;
    if (retries < MAX_SIZE_RETRIES) {
      (el as LGElement & { __lgRetries?: number }).__lgRetries = retries + 1;
      if (pending?.retryRaf) cancelAnimationFrame(pending.retryRaf);
      const id = requestAnimationFrame(() => {
        if (el.isConnected) applyLiquidGlass(el, opts);
      });
      if (pending) pending.retryRaf = id;
    }
    return;
  }
  (el as LGElement & { __lgRetries?: number }).__lgRetries = 0;

  const first = !el.__lg;
  const lightEl = o.lightHost === "parent" && el.parentElement ? el.parentElement : el;
  const state: GlassState =
    el.__lg ??
    (el.__lg = {
      id: `${ID_PREFIX}${++idCounter}`,
      opts: o,
      filter: null,
      disp: null,
      images: [],
      specImages: [],
      cap: 0,
      maxShift: 0,
      energy: 0,
      lightEl,
      sx: 1,
      sy: 1,
    });
  state.opts = o;
  el.classList.add("lg-surface");
  if (lightEl !== el) lightEl.classList.add("lg-surface");

  // Material base: tint + adaptive backdrop wash. The wash reads a CSS
  // variable, so a backdrop change re-tints every surface without
  // re-applying the engine.
  // Under it all, --glass-body (styles/glass-system.css): the material's
  // own dark body, so glass over a dark stage still has substance.
  const tint = `linear-gradient(rgba(${o.tintColor},${o.tint}), rgba(${o.tintColor},${o.tint}))`;
  el.style.background =
    o.adaptive > 0
      ? `linear-gradient(rgba(var(--backdrop-tint-rgb), ${o.adaptive}), rgba(var(--backdrop-tint-rgb), ${o.adaptive})), ${tint}, var(--glass-body)`
      : `${tint}, var(--glass-body)`;

  const fx = `saturate(${o.saturate}) brightness(${o.brightness}) contrast(${o.contrast})`;
  let backdrop = `blur(${o.blur + 10}px) ${fx}`;
  if (supportsRefraction()) {
    // Same size + same shape as last time (e.g. a ResizeObserver's
    // initial callback): nothing to rebuild.
    const key = `${o.stretch === "x" ? "x" : width}x${height}r${o.radius}b${o.bezel}s${o.strength}`;
    if (key === state.mapKey && state.filter) {
      backdrop = `blur(${o.blur}px) url(#${state.id}) ${fx}`;
      setDispScale(state);
    } else {
      const map = buildMap(width, height, o.radius, o.bezel, o.strength, o.stretch);
      if (map) {
        buildFilter(el, state, map, width, height);
        state.mapKey = key;
        backdrop = `blur(${o.blur}px) url(#${state.id}) ${fx}`;
      }
    }
  }
  // (No refraction: a denser frost keeps text on the surface legible —
  // the light and press layers still apply.)
  el.style.backdropFilter = backdrop;
  (el.style as unknown as Record<string, string>).webkitBackdropFilter = backdrop;

  if (first) {
    attachPress(el, state);
    // Materialize: the lens springs up from flat instead of fading in.
    if (prefersReducedMotion()) {
      state.energy = REST_ENERGY;
      setDispScale(state);
    } else {
      animateEnergy(state, REST_ENERGY, MATERIALIZE);
    }
    if (o.stretch === "x" && state.disp) {
      state.stretchObserver = new ResizeObserver(() => layoutStretch(el, state));
      state.stretchObserver.observe(el);
    }
    if (o.autoResize) {
      let seen = false;
      state.resizeObserver = new ResizeObserver(() => {
        // The initial notification just reports the size we built for.
        if (!seen) {
          seen = true;
          return;
        }
        if (state.resizeTimer) clearTimeout(state.resizeTimer);
        state.resizeTimer = setTimeout(() => applyLiquidGlass(el, state.opts), 120);
      });
      state.resizeObserver.observe(el);
    }
  }
}

export function releaseLiquidGlass(element: HTMLElement) {
  const el = element as LGElement;
  const state = el.__lg;
  if (!state) return;
  state.endPress?.();
  state.energyAnim?.stop();
  state.scaleAnim?.stop();
  state.glowAnim?.stop();
  state.stretchObserver?.disconnect();
  state.resizeObserver?.disconnect();
  if (state.resizeTimer) clearTimeout(state.resizeTimer);
  if (state.retryRaf) cancelAnimationFrame(state.retryRaf);
  if (state.onPointerDown) el.removeEventListener("pointerdown", state.onPointerDown);
  state.filter?.remove();
  el.style.scale = "";
  el.classList.remove("lg-surface");
  if (state.lightEl !== el) state.lightEl.classList.remove("lg-surface");
  delete el.__lg;
}

/* Attach to any element: <div ref={useLiquidGlass({...}) as ...>.
   Re-applies on resize (the displacement map is size-dependent).

   observe: false skips the ResizeObserver and re-applies only on
   window resize — for elements that animate their own size
   continuously but don't use `stretch` (rebuilding the displacement
   canvas per frame would be jank). */
export function useLiquidGlass<T extends HTMLElement = HTMLDivElement>(
  opts?: LiquidGlassOptions & { observe?: boolean },
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // useLayoutEffect + a SYNCHRONOUS first application — the material
  // must exist on the element's first painted frame (the .liquid-glass
  // CSS base covers the sub-frame before even this runs). Later
  // re-applications are rAF-coalesced and debounced.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const apply = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => applyLiquidGlass(el, optsRef.current));
    };
    applyLiquidGlass(el, optsRef.current);
    const observe = optsRef.current?.observe !== false && !optsRef.current?.stretch;
    let ro: ResizeObserver | undefined;
    let onWinResize: (() => void) | undefined;
    if (observe) {
      // Debounced (120ms after the box stops changing size): one map
      // rebuild per resize gesture, not one per frame. (The engine
      // also skips the rebuild when the size didn't actually change,
      // e.g. the observer's initial notification.)
      ro = new ResizeObserver(() => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(apply, 120);
      });
      ro.observe(el);
    } else {
      onWinResize = () => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(apply, 150);
      };
      window.addEventListener("resize", onWinResize);
    }
    return () => {
      cancelAnimationFrame(raf);
      if (debounce) clearTimeout(debounce);
      ro?.disconnect();
      if (onWinResize) window.removeEventListener("resize", onWinResize);
      releaseLiquidGlass(el);
    };
  }, []);

  return ref;
}
