"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  type MotionValue,
} from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { NAV_ITEMS } from "@/data/nav";

/* ── Icon art — same /icons/*.png set + rounded-square treatment
   used by the Skills page's macOS App Library grid (app/skills/page.tsx).
   Placeholder mapping — not meant to be semantically final per nav item. */

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
   Ported from the real buildui.com/recipes/magnified-dock technique.

   Two bugs in the previous version, both from the same root cause —
   animating `width`/`height` on the exact element used to MEASURE
   distance-to-cursor:
   1. Growing width/height reflows the flex row, so the dock's own
      background pill kept resizing every frame ("shaking").
   2. Because that same element's getBoundingClientRect() was read
      mid-resize, each icon's measured position kept shifting while
      its neighbors were also mid-animation — a feedback loop that
      broke down in the middle of the row ("losing" the effect).

   Fixed by splitting the two concerns: `slotRef` is a fixed-size,
   never-animated box used ONLY for position measurement (always
   stable, so the row's layout never reflows) — the visual grow/shrink
   happens on an INNER element via `scale` transform, which never
   affects layout at all. A small `x` nudge (also transform, not
   layout) pushes neighbors apart, matching the reference. See
   docs/design-system/motion.md. */

const BASE_SIZE = 50;
const MAX_SCALE = 1.8;
const DISTANCE = 150;
const NUDGE = 10;
const GAP = 14;
const PADDING_X = 16;
const SPRING = { mass: 0.1, stiffness: 170, damping: 12 };
// A touch more damped than the per-icon spring so the pill's width doesn't
// overshoot/wobble while several icons are independently still settling.
const WIDTH_SPRING = { mass: 0.2, stiffness: 200, damping: 26 };

function DockIcon({
  href,
  label,
  mouseX,
  isActive,
  onNavigate,
  glassBorder,
  labelBg,
  onScaleChange,
}: {
  href: string;
  label: string;
  mouseX: MotionValue<number>;
  isActive: boolean;
  onNavigate: () => void;
  glassBorder: string;
  labelBg: string;
  onScaleChange: (value: number) => void;
}) {
  // Fixed-size slot — NEVER transformed or resized. This is what keeps
  // the dock's own layout (and every other icon's measured position)
  // perfectly stable regardless of how much this icon magnifies.
  const slotRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const distance = useTransform(mouseX, (val) => {
    const bounds = slotRef.current?.getBoundingClientRect();
    if (!bounds) return Infinity;
    return val - (bounds.left + bounds.width / 2);
  });

  const scaleTarget = useTransform(distance, [-DISTANCE, 0, DISTANCE], [1, MAX_SCALE, 1]);
  const scale = useSpring(scaleTarget, SPRING);

  // Report this icon's live (spring-smoothed) scale up to the Dock so the
  // pill's own width can smoothly track total magnified width — this is
  // a motion-value listener, not React state, so it never triggers a
  // React re-render; only the width motion value bound to the pill's
  // style changes.
  useEffect(() => scale.on("change", onScaleChange), [scale, onScaleChange]);

  const xTarget = useTransform(distance, (d) => {
    if (d === Infinity || d < -DISTANCE || d > DISTANCE) return 0;
    return (-d / DISTANCE) * NUDGE;
  });
  const x = useSpring(xTarget, SPRING);

  return (
    <div
      ref={slotRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        width: `${BASE_SIZE}px`,
        height: `${BASE_SIZE}px`,
        flexShrink: 0,
      }}
    >
      {/* Hover label — macOS Dock tooltip, fixed height above the row
          (real Dock tooltips don't chase the magnified icon either) */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            style={{
              position: "absolute",
              bottom: `${BASE_SIZE * MAX_SCALE + 14}px`,
              left: "50%",
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
              padding: "4px 10px",
              borderRadius: "8px",
              background: labelBg,
              border: `0.5px solid ${glassBorder}`,
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-primary)",
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visual layer — scale + x are transforms only, so this can grow
          well past the slot's box without ever affecting layout. */}
      <motion.div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: `${BASE_SIZE}px`,
          height: `${BASE_SIZE}px`,
          scale,
          x,
          transformOrigin: "50% 100%",
        }}
      >
        <motion.button
          onClick={onNavigate}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: 0,
            display: "block",
          }}
        >
          <img
            src={`/icons/${ICON_FILE[href] ?? "react"}.png`}
            alt={label}
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              objectFit: "cover",
              borderRadius: "22%",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.35)",
            }}
          />
        </motion.button>

        {/* Active route indicator — a plain dot, matching real macOS
            Dock convention for open/active apps. No ring on the icon. */}
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
      </motion.div>
    </div>
  );
}

const REST_WIDTH = NAV_ITEMS.length * BASE_SIZE + (NAV_ITEMS.length - 1) * GAP + PADDING_X * 2;

export default function Dock() {
  const pathname = usePathname();
  const router = useRouter();
  const { isDarkTheme } = useTheme();
  const mouseX = useMotionValue(Infinity);

  // Live per-icon scale readings, aggregated into the pill's own width —
  // this is what makes the dock widen smoothly as icons magnify, the way
  // the real macOS Dock does, while each icon's fixed-size measurement
  // slot (see DockIcon) keeps that growth from ever being jittery.
  const scalesRef = useRef<number[]>(NAV_ITEMS.map(() => 1));
  const rawWidth = useMotionValue(REST_WIDTH);
  const width = useSpring(rawWidth, WIDTH_SPRING);

  const makeScaleHandler = useCallback(
    (index: number) => (value: number) => {
      scalesRef.current[index] = value;
      const total =
        scalesRef.current.reduce((sum, s) => sum + BASE_SIZE * s, 0) +
        GAP * (NAV_ITEMS.length - 1) +
        PADDING_X * 2;
      rawWidth.set(total);
    },
    [rawWidth]
  );

  const glassBg = isDarkTheme ? "rgba(28, 28, 30, 0.78)" : "rgba(255, 255, 255, 0.78)";
  const glassBorder = isDarkTheme ? "rgba(255, 255, 255, 0.10)" : "rgba(0, 0, 0, 0.06)";
  const labelBg = isDarkTheme ? "rgba(28, 28, 30, 0.92)" : "rgba(255, 255, 255, 0.95)";

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        left: 0,
        right: 0,
        zIndex: 90,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <motion.nav
        initial={{ y: 70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 25, mass: 0.8, delay: 0.15 }}
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: `${GAP}px`,
          padding: `10px ${PADDING_X}px`,
          width,
          borderRadius: "32px",
          background: glassBg,
          border: `0.5px solid ${glassBorder}`,
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
          transition: "background 0.22s ease, border-color 0.22s ease",
          overflow: "visible",
          pointerEvents: "auto",
        }}
      >
        {NAV_ITEMS.map((item, i) => (
          <DockIcon
            key={item.href}
            href={item.href}
            label={item.label}
            mouseX={mouseX}
            isActive={pathname === item.href}
            onNavigate={() => router.push(item.href)}
            glassBorder={glassBorder}
            labelBg={labelBg}
            onScaleChange={makeScaleHandler(i)}
          />
        ))}
      </motion.nav>
    </div>
  );
}
