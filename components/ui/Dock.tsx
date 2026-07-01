"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { NAV_ITEMS } from "@/data/nav";

/* ── Icon art — same /icons/*.png set + rounded-square treatment
   used by the Skills page's macOS App Library grid (app/skills/page.tsx),
   swapped in here for a consistent "real app icon" look instead of flat
   line-SVGs, which read as too plain for a Dock. Placeholder mapping —
   not meant to be semantically perfect per nav item yet. ────────────── */

const ICON_FILE: Record<string, string> = {
  "/": "react",
  "/about": "github",
  "/projects": "vscode",
  "/skills": "python",
  "/dsa": "javascript",
  "/notes": "claude",
  "/uses": "linux",
};

/* ── Authentic macOS magnification curve ──────────────────────────
   Cosine-based falloff around the cursor, exactly how the real Dock
   computes per-icon scale — see docs/design-system/motion.md. */

const BASE_ICON_SIZE = 50;
const BASE_SPACING = 10;
const MIN_SCALE = 1;
const MAX_SCALE = 1.65;
const EFFECT_WIDTH = 240;

function targetScales(mouseX: number | null, count: number) {
  if (mouseX === null) return new Array(count).fill(MIN_SCALE);
  const minX = mouseX - EFFECT_WIDTH / 2;
  return Array.from({ length: count }, (_, i) => {
    const center = i * (BASE_ICON_SIZE + BASE_SPACING) + BASE_ICON_SIZE / 2;
    if (center < minX || center > minX + EFFECT_WIDTH) return MIN_SCALE;
    const theta = ((center - minX) / EFFECT_WIDTH) * Math.PI * 2;
    const factor = (1 - Math.cos(theta)) / 2;
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
  const pathname = usePathname();
  const router = useRouter();
  const { isDarkTheme } = useTheme();

  const [mouseX, setMouseX] = useState<number | null>(null);
  const [scales, setScales] = useState<number[]>(() => NAV_ITEMS.map(() => MIN_SCALE));
  const [hovered, setHovered] = useState<number | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const scalesRef = useRef(scales);
  scalesRef.current = scales;

  useEffect(() => {
    const tick = () => {
      const targets = targetScales(mouseX, NAV_ITEMS.length);
      const lerp = mouseX !== null ? 0.22 : 0.14;
      const current = scalesRef.current;
      let settled = true;
      const next = current.map((s, i) => {
        const delta = targets[i] - s;
        if (Math.abs(delta) > 0.002) settled = false;
        return s + delta * lerp;
      });
      setScales(next);
      if (!settled || mouseX !== null) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mouseX]);

  const positions = useMemo(() => positionsFromScales(scales), [scales]);
  const contentWidth = positions.length
    ? positions[positions.length - 1] + (BASE_ICON_SIZE * scales[scales.length - 1]) / 2
    : 0;

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dockRef.current) return;
    const rect = dockRef.current.getBoundingClientRect();
    setMouseX(e.clientX - rect.left - 12);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMouseX(null);
    setHovered(null);
  }, []);

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
        ref={dockRef}
        initial={{ y: 70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 25, mass: 0.8, delay: 0.15 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          position: "relative",
          height: `${BASE_ICON_SIZE + 20}px`,
          width: `${contentWidth + 24}px`,
          padding: "10px 12px",
          borderRadius: `${Math.max(20, BASE_ICON_SIZE * 0.4 + 10)}px`,
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
          const iconFile = ICON_FILE[item.href] ?? "react";
          const isActive = pathname === item.href;
          const scale = scales[i] ?? MIN_SCALE;
          const size = BASE_ICON_SIZE * scale;
          const center = positions[i] ?? 0;

          return (
            <div
              key={item.href}
              onMouseEnter={() => setHovered(i)}
              style={{
                position: "absolute",
                left: `${12 + center - size / 2}px`,
                bottom: "10px",
                width: `${size}px`,
                height: `${size}px`,
                zIndex: Math.round(scale * 10),
              }}
            >
              {/* Hover label — macOS Dock tooltip */}
              <AnimatePresence>
                {hovered === i && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.94 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    style={{
                      position: "absolute",
                      bottom: `${size + 14}px`,
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
                    {item.label}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                onClick={() => router.push(item.href)}
                whileTap={{ scale: 0.85, y: 2 }}
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
                  src={`/icons/${iconFile}.png`}
                  alt={item.label}
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    objectFit: "cover",
                    borderRadius: `${size * 0.22}px`,
                    boxShadow: isActive
                      ? "0 2px 10px rgba(255, 69, 0, 0.35)"
                      : "0 2px 8px rgba(0, 0, 0, 0.35)",
                    outline: isActive ? "1.5px solid #FF4500" : "1.5px solid transparent",
                    outlineOffset: "2px",
                    transition: "outline-color 0.15s ease, box-shadow 0.15s ease",
                  }}
                />
              </motion.button>

              {/* Active route indicator */}
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
      </motion.nav>
    </div>
  );
}
