"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { useShellMetrics } from "@/lib/useShellMetrics";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import { NAV_ITEMS } from "@/data/nav";

/* ── Icon art — plain /icons/*.png, no clip mask or box-shadow "chip"
   imposed on top (that was the "invisible border" bug — a rectangular
   box-shadow ignores a transparent PNG's real silhouette and reads as
   a border around it). Placeholder mapping — not semantically final. */

const ICON_FILE: Record<string, string> = {
  "/": "react",
  "/about": "github",
  "/projects": "vscode",
  "/skills": "python",
  "/dsa": "javascript",
  "/notes": "claude",
  "/uses": "linux",
};

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
  if (mouseX === null) return NAV_ITEMS.map(() => MIN_SCALE);
  const minX = mouseX - EFFECT_WIDTH / 2;
  const maxX = mouseX + EFFECT_WIDTH / 2;
  return NAV_ITEMS.map((_, index) => {
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
  const { windows, openWindow, registerDockIconEl } = useWindowManager();

  const [scales, setScales] = useState<number[]>(() => NAV_ITEMS.map(() => MIN_SCALE));
  const [positions, setPositions] = useState<number[]>(() => positionsFromScales(NAV_ITEMS.map(() => MIN_SCALE)));
  const [bounced, setBounced] = useState<number | null>(null);

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
    (href: string, label: string, index: number) => {
      setBounced(index);
      setTimeout(() => setBounced(null), 200);
      openWindow(href, label);
    },
    [openWindow]
  );

  // Single source of truth for the pill's own width — derived from the
  // exact same positions/scales this frame drew, so it can never be a
  // frame (or a whole separate spring) out of sync with the icons.
  const contentWidth = positions.length
    ? Math.max(...positions.map((pos, i) => pos + (BASE_ICON_SIZE * scales[i]) / 2))
    : NAV_ITEMS.length * (BASE_ICON_SIZE + BASE_SPACING) - BASE_SPACING;

  const glassBg = isDarkTheme ? "rgba(28, 28, 30, 0.78)" : "rgba(255, 255, 255, 0.78)";
  const glassBorder = isDarkTheme ? "rgba(255, 255, 255, 0.10)" : "rgba(0, 0, 0, 0.06)";

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
          background: glassBg,
          border: `0.5px solid ${glassBorder}`,
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
          transition: "background 0.22s ease, border-color 0.22s ease",
          pointerEvents: "auto",
        }}
      >
        {NAV_ITEMS.map((item, i) => {
          const scale = scales[i] ?? MIN_SCALE;
          const position = positions[i] ?? 0;
          const scaledSize = BASE_ICON_SIZE * scale;
          const isActive = windows.some((w) => w.route === item.href);

          return (
            <div
              key={item.href}
              ref={(el) => registerDockIconEl(item.href, el)}
              onClick={() => handleClick(item.href, item.label, i)}
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
              <motion.img
                src={`/icons/${ICON_FILE[item.href] ?? "react"}.png`}
                alt={item.label}
                draggable={false}
                animate={bounced === i ? { y: [-0, -8, 0] } : { y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  filter: `drop-shadow(0 ${scale > 1.2 ? 3 : 2}px ${scale > 1.2 ? 6 : 4}px rgba(0, 0, 0, ${0.25 + (scale - 1) * 0.15}))`,
                }}
              />

              {/* Active route indicator — a plain dot, matching real
                  macOS Dock convention for open/active apps. */}
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "-8px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    background: "#FF4500",
                  }}
                />
              )}
            </div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
