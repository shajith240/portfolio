"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

/* Liquid Glass refraction engine — TypeScript port of the reference
   implementation the user supplied (D:\msi\liquid-glass-dark.html),
   which is the closest web reproduction of Apple's material we've
   seen. How it works:

   1. An SDF of the element's rounded-rect is evaluated per pixel;
      the displacement is zero through the interior and ramps up
      inside a "bezel" band near the rim (glass bends light at its
      edges, not in the middle of a flat pane).
   2. That field is baked into a canvas (R = x-shift, G = y-shift,
      128 = neutral) and fed to an SVG feDisplacementMap used as a
      backdrop-filter — REAL refraction of whatever sits behind.
   3. Dark-mode signature per the reference: brightness(<1) darkens
      the backdrop (light mode brightens), the tint is a low-alpha
      cool near-black, and the rim light does the separation work
      (see .liquid-glass in glass-system.css for the directional rim
      + gloss pseudo-elements that finish the material).

   Chromium-only for the refraction: Safari/Firefox reject SVG url()
   in backdrop-filter, detected at apply time and downgraded to a
   blur+saturate fallback. */

export interface LiquidGlassOptions {
  radius?: number; // px — must match the element's border-radius
  bezel?: number; // px — width of the refracting rim band
  strength?: number; // 0..1 — how hard the bezel pulls
  refraction?: number; // multiplier on the displacement scale
  blur?: number; // px backdrop blur — real Liquid Glass is 3-6px, NOT frosted-glass 12-20px
  saturate?: number;
  brightness?: number; // <1 darkens (dark-mode glass), >1 lightens
  contrast?: number;
  tint?: number; // fill alpha
  tintColor?: string; // "r,g,b"
  // Adaptive color: Apple's material picks up the color of what's
  // behind it. We approximate with the wallpaper's average color
  // (--wallpaper-tint-rgb, live-updated on wallpaper change by
  // useWallpaper), washed over the base tint at low alpha. 0 disables.
  adaptive?: number;
}

const DEFAULTS: Required<LiquidGlassOptions> = {
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
};

const SVG_NS = "http://www.w3.org/2000/svg";
let idCounter = 0;

interface LGElement extends HTMLElement {
  __lgId?: string;
  __lgFeImage?: SVGFEImageElement;
  __lgFeDisp?: SVGFEDisplacementMapElement;
}

function clamp01(x: number) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
function smoothStep(e0: number, e1: number, x: number) {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}
function roundedRectSDF(x: number, y: number, hw: number, hh: number, r: number) {
  const qx = Math.abs(x) - hw + r;
  const qy = Math.abs(y) - hh + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}

function buildDisplacementMap(width: number, height: number, radius: number, bezel: number, strength: number) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const cx = w / 2;
  const cy = h / 2;
  const hw = w / 2;
  const hh = h / 2;
  const r = Math.min(radius, Math.min(hw, hh));
  const raw = new Float32Array(w * h * 2);
  let maxShift = 0;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const x = px + 0.5 - cx;
      const y = py + 0.5 - cy;
      const d = roundedRectSDF(x, y, hw, hh, r); // ~0 at rim, negative inside
      const edge = smoothStep(-bezel, 0, d); // 0 interior → 1 rim
      const pull = edge * edge * strength; // convex bezel
      const scale = 1 - pull;
      const dx = x * scale - x;
      const dy = y * scale - y;
      const i = (py * w + px) * 2;
      raw[i] = dx;
      raw[i + 1] = dy;
      const m = Math.max(Math.abs(dx), Math.abs(dy));
      if (m > maxShift) maxShift = m;
    }
  }
  if (maxShift === 0) maxShift = 1;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const img = ctx.createImageData(w, h);
  const data = img.data;
  for (let p = 0; p < w * h; p++) {
    data[p * 4] = 128 + (raw[p * 2] / maxShift) * 127;
    data[p * 4 + 1] = 128 + (raw[p * 2 + 1] / maxShift) * 127;
    data[p * 4 + 2] = 128;
    data[p * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return { url: c.toDataURL(), maxShift };
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

export function applyLiquidGlass(element: HTMLElement, opts?: LiquidGlassOptions) {
  const el = element as LGElement;
  const o = { ...DEFAULTS, ...opts };
  // offsetWidth/Height, NOT getBoundingClientRect: the rect includes
  // CSS transforms, and glass surfaces routinely apply while their
  // entrance animation (scale 0.98, etc.) is mid-flight — the map
  // must be built for the LAID-OUT size the element settles at.
  const width = el.offsetWidth;
  const height = el.offsetHeight;
  if (width < 2 || height < 2) return;

  const map = buildDisplacementMap(width, height, o.radius, o.bezel, o.strength);
  if (!map) return;

  const id = el.__lgId ?? (el.__lgId = `lg${++idCounter}`);
  let filter = document.getElementById(id) as SVGFilterElement | null;
  if (!filter) {
    filter = document.createElementNS(SVG_NS, "filter");
    filter.setAttribute("id", id);
    // sRGB interpolation is CRUCIAL — the neutral 128 gray of the
    // map is only "zero displacement" in sRGB.
    filter.setAttribute("color-interpolation-filters", "sRGB");
    filter.setAttribute("x", "0");
    filter.setAttribute("y", "0");
    filter.setAttribute("width", "100%");
    filter.setAttribute("height", "100%");
    const feImage = document.createElementNS(SVG_NS, "feImage");
    feImage.setAttribute("result", "map");
    feImage.setAttribute("preserveAspectRatio", "none");
    const feDisp = document.createElementNS(SVG_NS, "feDisplacementMap");
    feDisp.setAttribute("in", "SourceGraphic");
    feDisp.setAttribute("in2", "map");
    feDisp.setAttribute("xChannelSelector", "R");
    feDisp.setAttribute("yChannelSelector", "G");
    filter.append(feImage, feDisp);
    ensureDefs().appendChild(filter);
    el.__lgFeImage = feImage;
    el.__lgFeDisp = feDisp;
  }
  el.__lgFeImage!.setAttribute("href", map.url);
  el.__lgFeImage!.setAttribute("width", String(width));
  el.__lgFeImage!.setAttribute("height", String(height));
  el.__lgFeDisp!.setAttribute("scale", String(map.maxShift * o.refraction));

  // Base tint + adaptive wallpaper wash. The wash uses the live CSS
  // variable, so every glass surface shifts color the instant the
  // wallpaper changes — no JS re-application needed.
  el.style.background =
    o.adaptive > 0
      ? `linear-gradient(rgba(var(--wallpaper-tint-rgb), ${o.adaptive}), rgba(var(--wallpaper-tint-rgb), ${o.adaptive})), rgba(${o.tintColor},${o.tint})`
      : `rgba(${o.tintColor},${o.tint})`;
  const fx = `saturate(${o.saturate}) brightness(${o.brightness}) contrast(${o.contrast})`;
  const withRefraction = `url(#${id}) blur(${o.blur}px) ${fx}`;
  const fallback = `blur(${o.blur + 4}px) ${fx}`;
  el.style.backdropFilter = withRefraction;
  (el.style as unknown as Record<string, string>).webkitBackdropFilter = withRefraction;
  const applied = getComputedStyle(el).backdropFilter || "";
  if (!applied.includes("url")) {
    // Safari/Firefox: SVG filters are rejected as backdrop input.
    el.style.backdropFilter = fallback;
    (el.style as unknown as Record<string, string>).webkitBackdropFilter = fallback;
  }
}

export function releaseLiquidGlass(element: HTMLElement) {
  const el = element as LGElement;
  if (el.__lgId) {
    document.getElementById(el.__lgId)?.remove();
    delete el.__lgId;
    delete el.__lgFeImage;
    delete el.__lgFeDisp;
  }
}

/* Attach to any element: <div ref={useLiquidGlass({...}) as ...>.
   Re-applies on resize (the displacement map is size-dependent).

   observe: false skips the ResizeObserver and re-applies only on
   window resize — REQUIRED for elements that animate their own size
   continuously (the Dock magnifies every mousemove frame; rebuilding
   the displacement canvas per frame would be jank). The SVG filter
   region is percentage-based, so the map stretches gracefully with
   small size changes between rebuilds. */
export function useLiquidGlass<T extends HTMLElement = HTMLDivElement>(
  opts?: LiquidGlassOptions & { observe?: boolean },
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // useLayoutEffect + a SYNCHRONOUS first application — the material
  // must exist on the element's first painted frame. The previous
  // useEffect + requestAnimationFrame deferral let the surface paint
  // un-glassed for a frame or two before the engine caught up, a
  // small but visible "glass pops in" latency on every panel open
  // (the .liquid-glass CSS base covers the sub-frame before even this
  // runs; together they make the material appear latency-free).
  // Observer/resize RE-applications stay rAF-coalesced + debounced —
  // only the first paint is latency-critical.
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
    const observe = optsRef.current?.observe !== false;
    let ro: ResizeObserver | undefined;
    let onWinResize: (() => void) | undefined;
    if (observe) {
      // Debounced (120ms after the box stops changing size), matching
      // Window.tsx's own inline glass effect — NOT one rebuild per
      // ResizeObserver tick. `apply`'s own rAF only coalesces multiple
      // notifications landing in the SAME frame; it does nothing for a
      // continuous resize spanning many frames (e.g. dragging a
      // widget's resize handle for a second fires ~60 notifications
      // across ~60 different frames), so every one of those still ran
      // this hook's full O(width×height) displacement-map rebuild +
      // canvas encode before this fix — the actual source of the
      // "sticky" feeling during a widget resize-drag.
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
