"use client";

import { Fragment, useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { useShellMetrics } from "@/lib/useShellMetrics";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import { NAV_ITEMS } from "@/data/nav";
import { applyLiquidGlass, releaseLiquidGlass } from "@/lib/liquidGlass";

/* ── Icon art — plain /icons/*.png, no clip mask or box-shadow "chip"
   imposed on top (that was the "invisible border" bug — a rectangular
   box-shadow ignores a transparent PNG's real silhouette and reads as
   a border around it). Real icon set (extracted from the .icns files
   dropped into public/icons/ — see the ic10 1024x1024 PNG chunk each
   one embeds). "/skills" intentionally uses skills.png — despite the
   filename, that file is a terminal-glyph icon, not the skills.icns
   originally extracted for "/dsa"'s old slot. "/dsa" uses xcode.png.
   dsa.icns/dsa.png also exist but aren't used by any Dock slot. */

const ICON_FILE: Record<string, string> = {
  finder: "finder",
  "/about": "contact",
  "/projects": "projects",
  "/skills": "skills",
  "/dsa": "xcode",
  "/notes": "notes",
  "/uses": "settings",
  "external:github": "github",
  "external:linkedin": "linkedin",
  "external:leetcode": "leetcode",
};

/* Real profile links (data/nav.ts and CommandPalette.tsx both already
   point here) — these open the actual external profile in a new tab,
   same as real macOS opening a web link from an app, not an internal
   window. "external:*" is a sentinel href, like Finder's, that never
   collides with a real window route so isActive/registerDockIconEl
   stay correct for free. LeetCode username matches the hardcoded
   fallback in app/api/leetcode/route.ts. */
const EXTERNAL_LINKS: { href: string; label: string; url: string }[] = [
  { href: "external:github", label: "GitHub", url: "https://github.com/shajith240" },
  { href: "external:linkedin", label: "LinkedIn", url: "https://linkedin.com/in/shajith240" },
  { href: "external:leetcode", label: "LeetCode", url: "https://leetcode.com/u/shajith240/" },
];

/* Finder is a permanent Dock item, always leftmost, same as real macOS
   — it isn't a NAV_ITEMS entry (those are real routed pages; Finder's
   route is the "finder" sentinel handled by WindowManagerContext) but
   it shares the exact same magnification physics, so it's folded into
   one combined list below rather than rendered as a separate,
   un-magnified icon. Home ("/") is deliberately excluded — the user
   asked for it removed from the Dock; NAV_ITEMS itself (shared with
   MobileTabBar/CommandPalette/MenuBar) is left untouched, so mobile
   nav and the command palette still list Home. External profile links
   sit last, after a divider, matching where real macOS puts Trash/the
   Downloads stack — persistent utilities separated from the running
   apps rather than mixed in with them. */
const DOCK_ITEMS: { href: string; label: string; isFinder: boolean; external?: string }[] = [
  { href: "finder", label: "Finder", isFinder: true },
  ...NAV_ITEMS.filter((item) => item.href !== "/").map((item) => ({ href: item.href, label: item.label, isFinder: false })),
  ...EXTERNAL_LINKS.map((item) => ({ href: item.href, label: item.label, isFinder: false, external: item.url })),
];
const FIRST_EXTERNAL_INDEX = DOCK_ITEMS.length - EXTERNAL_LINKS.length;

/* ── Authentic macOS Dock magnification ───────────────────────────
   Faithful port of the reference implementation (cosine-based
   falloff, single rAF loop, scale+position computed together each
   tick from one `mouseX` value) — this is what "the accurate
   animation" means: the pill's own width is derived from the SAME
   `positions`/`scales` array in the SAME tick, so it can never drift
   out of sync with what's actually drawn. An earlier version computed
   width from a separately-sprung aggregate with its own independent
   physics, which is exactly what looked "random" — two things chasing
   each other instead of one shared source of truth.

   Learned from an earlier broken attempt (kept here so it isn't
   repeated): never measure an icon's own position from an element
   whose size is itself animating — that creates a feedback loop. Here
   every icon's position is pure math (index × pitch), and the only
   live DOM read is the container's own left edge, once per
   mouse-move. See docs/design-system/motion.md. */

const BASE_ICON_SIZE = 50;
const MAX_SCALE = 1.7;
const EFFECT_WIDTH = 260;
const MIN_SCALE = 1;
const BASE_SPACING = 14;
const PADDING = 14;

function targetScales(mouseX: number | null) {
  if (mouseX === null) return DOCK_ITEMS.map(() => MIN_SCALE);
  const minX = mouseX - EFFECT_WIDTH / 2;
  const maxX = mouseX + EFFECT_WIDTH / 2;
  return DOCK_ITEMS.map((_, index) => {
    const center = index * (BASE_ICON_SIZE + BASE_SPACING) + BASE_ICON_SIZE / 2;
    if (center < minX || center > maxX) return MIN_SCALE;
    const theta = ((center - minX) / EFFECT_WIDTH) * 2 * Math.PI;
    const capped = Math.min(Math.max(theta, 0), 2 * Math.PI);
    const factor = (1 - Math.cos(capped)) / 2;
    return MIN_SCALE + factor * (MAX_SCALE - MIN_SCALE);
  });
}

function positionsFromScales(scales: number[]) {
  let x = 0;
  return scales.map((s) => {
    const w = BASE_ICON_SIZE * s;
    const center = x + w / 2;
    x += w + BASE_SPACING;
    return center;
  });
}

export default function Dock() {
  const { isDarkTheme } = useTheme();
  const metrics = useShellMetrics();
  const { windows, openWindow, openFinder, registerDockIconEl } = useWindowManager();

  const [scales, setScales] = useState<number[]>(() => DOCK_ITEMS.map(() => MIN_SCALE));
  const [positions, setPositions] = useState<number[]>(() => positionsFromScales(DOCK_ITEMS.map(() => MIN_SCALE)));
  const [bounced, setBounced] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const bounceControlsRef = useRef<Record<number, any>>({});

  const dockRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  // Live cursor position lives in a ref, not React state — a single
  // rAF loop below reads it fresh every tick for as long as the
  // component is mounted. The earlier version re-created the whole
  // animation callback via useCallback([mouseX]) every time the mouse
  // moved; each generation only ever rescheduled ITSELF recursively,
  // so once the cursor left, the in-flight loop kept chasing the
  // stale pre-leave position forever — icons stuck enlarged, never
  // told to relax back to rest. One persistent loop + a ref for the
  // only thing that actually needs to be "latest" fixes that class of
  // bug entirely.
  const mouseXRef = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      if (!alive) return;
      const mouseX = mouseXRef.current;
      const targets = targetScales(mouseX);
      const targetPositions = positionsFromScales(targets);
      const lerp = mouseX !== null ? 0.22 : 0.14;

      setScales((prev) => prev.map((s, i) => s + (targets[i] - s) * lerp));
      setPositions((prev) => prev.map((p, i) => p + (targetPositions[i] - p) * lerp));

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      alive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dockRef.current) return;
    const rect = dockRef.current.getBoundingClientRect();
    mouseXRef.current = e.clientX - rect.left - PADDING;
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseXRef.current = null;
  }, []);

  const handleClick = useCallback(
    (href: string, label: string, index: number, isFinder: boolean, external?: string) => {
      // Check if window is already open
      const isOpen = windows.some((w) => w.route === href);

      if (external) {
        // External links always open in new tab, no bounce
        window.open(external, "_blank", "noopener,noreferrer");
      } else if (isFinder) {
        // Check if Finder is already open
        const finderOpen = windows.some((w) => w.route === "finder");
        if (!finderOpen) {
          // Trigger bounce animation
          setBounced(index);
          setTimeout(() => setBounced(null), 700);
          openFinder();
        } else {
          openFinder();
        }
      } else {
        // Regular app window
        if (!isOpen) {
          // Trigger bounce animation
          setBounced(index);
          setTimeout(() => setBounced(null), 700);
          openWindow(href, label);
        } else {
          openWindow(href, label);
        }
      }
    },
    [openWindow, openFinder, windows]
  );

  // Single source of truth for the pill's own width — derived from the
  // exact same positions/scales this frame drew, so it can never be a
  // frame (or a whole separate spring) out of sync with the icons.
  const contentWidth = positions.length
    ? Math.max(...positions.map((pos, i) => pos + (BASE_ICON_SIZE * scales[i]) / 2))
    : DOCK_ITEMS.length * (BASE_ICON_SIZE + BASE_SPACING) - BASE_SPACING;

  const glassBg = isDarkTheme ? "rgba(28, 28, 30, 0.78)" : "rgba(255, 255, 255, 0.78)";
  const glassBorder = isDarkTheme ? "rgba(255, 255, 255, 0.10)" : "rgba(0, 0, 0, 0.06)";

  // Liquid Glass refraction on the slab — applied ONCE at mount +
  // window resize, deliberately NOT via ResizeObserver: the dock
  // animates its own width on every magnification frame, and
  // rebuilding the displacement canvas per frame would be jank. The
  // percentage-based filter region stretches the map through the
  // magnification instead.
  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const radius = Math.round((BASE_ICON_SIZE + 20) * 0.22);
    const apply = () => applyLiquidGlass(el, { radius, bezel: 13, strength: 0.66, blur: 5, brightness: 0.82, tint: 0.15 });
    apply();
    let t: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      if (t) clearTimeout(t);
      t = setTimeout(apply, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener("resize", onResize);
      releaseLiquidGlass(el);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      animate={{ left: `${metrics.contentLeft}px`, right: `${metrics.inset}px` }}
      transition={{ type: "spring", stiffness: 520, damping: 44, mass: 0.85 }}
      style={{
        position: "fixed",
        bottom: "24px",
        zIndex: 90,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <motion.div
        ref={dockRef}
        initial={{ y: 70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 25, mass: 0.8, delay: 0.15 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          position: "relative",
          width: `${contentWidth + PADDING * 2}px`,
          height: `${BASE_ICON_SIZE + 20}px`,
          padding: `10px ${PADDING}px`,
          // Real macOS Dock reads as a rounded rectangle, not a stadium/
          // pill — roughly 22% of its own height, the same squircle
          // ratio already used on the icons themselves (borderRadius:
          // "22%" below). The previous 32px (~46% of the 70px height)
          // was nearly semicircular at the ends, which is why it looked
          // over-rounded compared to the real thing.
          borderRadius: `${Math.round((BASE_ICON_SIZE + 20) * 0.22)}px`,
          // Material comes from the refraction engine (effect above)
          // + the .liquid-glass rim/gloss class — no inline frosted
          // background/blur/shadow here anymore.
          pointerEvents: "auto",
        }}
        className="liquid-glass"
      >
        {DOCK_ITEMS.map((item, i) => {
          const scale = scales[i] ?? MIN_SCALE;
          const position = positions[i] ?? 0;
          const scaledSize = BASE_ICON_SIZE * scale;
          const isActive = windows.some((w) => w.route === item.href);

          // Divider before the external-links group — a static hairline
          // in the gap before this icon, same spot real macOS puts the
          // line separating running apps from Trash/Downloads.
          const prevScale = scales[i - 1] ?? MIN_SCALE;
          const prevPosition = positions[i - 1] ?? 0;
          const showDivider = i === FIRST_EXTERNAL_INDEX && i > 0;
          const dividerX = showDivider
            ? (prevPosition + (BASE_ICON_SIZE * prevScale) / 2 + (position - (BASE_ICON_SIZE * scale) / 2)) / 2
            : 0;

          return (
            <Fragment key={item.href}>
              {showDivider && (
                <div
                  style={{
                    position: "absolute",
                    left: `${PADDING + dividerX}px`,
                    bottom: "10px",
                    width: "1px",
                    height: `${BASE_ICON_SIZE}px`,
                    background: glassBorder,
                  }}
                />
              )}
              <div
              ref={(el) => registerDockIconEl(item.href, el)}
              onClick={() => handleClick(item.href, item.label, i, item.isFinder, item.external)}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              title={item.label}
              style={{
                position: "absolute",
                left: `${PADDING + position - scaledSize / 2}px`,
                bottom: "10px",
                width: `${scaledSize}px`,
                height: `${scaledSize}px`,
                cursor: "pointer",
                zIndex: Math.round(scale * 10),
              }}
            >
              <motion.div
                animate={bounced === i ? { y: [0, -14, 0, -7, 0] } : { y: 0 }}
                transition={{
                  duration: 0.7,
                  ease: "easeOut",
                  times: [0, 0.25, 0.5, 0.75, 1],
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  filter: `drop-shadow(0 ${scale > 1.2 ? 3 : 2}px ${scale > 1.2 ? 6 : 4}px rgba(0, 0, 0, ${0.25 + (scale - 1) * 0.15}))`,
                }}
              >
                <img
                  src={`/icons/${ICON_FILE[item.href] ?? "react"}.png`}
                  alt={item.label}
                  draggable={false}
                  style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                />
              </motion.div>

              {/* Running-app indicator dot — 4px diameter, white with
                  opacity, centered under icon, with fade entrance. */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: "absolute",
                      bottom: "-6px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      background: "rgba(255, 255, 255, 0.85)",
                      pointerEvents: "none",
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Hover tooltip — glass pill with app name, positioned
                  above the icon with fade+rise entrance. */}
              <AnimatePresence>
                {hoveredIndex === i && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      marginBottom: "14px",
                      pointerEvents: "none",
                      whiteSpace: "nowrap",
                      zIndex: 1000,
                    }}
                  >
                    <div
                      style={{
                        padding: "5px 12px",
                        borderRadius: "8px",
                        background: "rgba(20, 20, 22, 0.85)",
                        backdropFilter: "blur(20px)",
                        WebkitBackdropFilter: "blur(20px)",
                        color: "rgba(255, 255, 255, 0.95)",
                        fontSize: "13px",
                        fontWeight: "500",
                        lineHeight: "1",
                      }}
                    >
                      {item.label}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </Fragment>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
