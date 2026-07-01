"use client";

import { useRef, useState } from "react";
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
   This is the same technique every well-regarded web Dock recreation
   uses (e.g. buildui.com/recipes/magnified-dock): each icon derives
   its own distance to the cursor and springs its own size through
   Framer Motion's motion-value pipeline. Framer writes the result
   straight to the DOM on its own frame loop — no React state, no
   re-render per mouse-move — which is what makes it feel
   continuously smooth instead of stepped. A hand-rolled
   requestAnimationFrame + setState loop (the first attempt here)
   re-renders the whole component on every animation tick and is
   exactly the kind of janky-by-construction approach this avoids.
   See docs/design-system/motion.md. */

const BASE_SIZE = 50;
const MAX_SIZE = 84;
const DISTANCE = 130;
const SPRING = { mass: 0.15, stiffness: 220, damping: 16 };

function DockIcon({
  href,
  label,
  mouseX,
  isActive,
  onNavigate,
  glassBorder,
  labelBg,
}: {
  href: string;
  label: string;
  mouseX: MotionValue<number>;
  isActive: boolean;
  onNavigate: () => void;
  glassBorder: string;
  labelBg: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return Infinity;
    return val - (bounds.left + bounds.width / 2);
  });

  const sizeTarget = useTransform(distance, [-DISTANCE, 0, DISTANCE], [BASE_SIZE, MAX_SIZE, BASE_SIZE]);
  const size = useSpring(sizeTarget, SPRING);

  return (
    <motion.div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {/* Hover label — macOS Dock tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            style={{
              position: "absolute",
              bottom: "calc(100% + 12px)",
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
            }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={onNavigate}
        whileTap={{ scale: 0.88 }}
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

      {/* Active route indicator — a plain dot, matching real macOS Dock
          convention for open/active apps. No ring/border on the icon itself. */}
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
  );
}

export default function Dock() {
  const pathname = usePathname();
  const router = useRouter();
  const { isDarkTheme } = useTheme();
  const mouseX = useMotionValue(Infinity);

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
          gap: "14px",
          padding: "10px 16px",
          borderRadius: "32px",
          background: glassBg,
          border: `0.5px solid ${glassBorder}`,
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
          transition: "background 0.22s ease, border-color 0.22s ease",
          pointerEvents: "auto",
        }}
      >
        {NAV_ITEMS.map((item) => (
          <DockIcon
            key={item.href}
            href={item.href}
            label={item.label}
            mouseX={mouseX}
            isActive={pathname === item.href}
            onNavigate={() => router.push(item.href)}
            glassBorder={glassBorder}
            labelBg={labelBg}
          />
        ))}
      </motion.nav>
    </div>
  );
}
