"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { NAV_ITEMS } from "@/data/nav";

/* ── Icons (22px, matches MobileTabBar's SF-style set) ────────────── */

const HomeIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    {!active && <polyline points="9,22 9,12 15,12 15,22" />}
  </svg>
);

const AboutIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ProjectsIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const SkillsIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.5} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
  </svg>
);

const DsaIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="8,6 3,12 8,18" />
    <polyline points="16,6 21,12 16,18" />
  </svg>
);

const NotesIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <polyline points="14,3 14,9 20,9" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="13" y2="17" />
  </svg>
);

const UsesIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const ICONS: Record<string, (props: { active: boolean }) => React.ReactElement> = {
  "/": HomeIcon,
  "/about": AboutIcon,
  "/projects": ProjectsIcon,
  "/skills": SkillsIcon,
  "/dsa": DsaIcon,
  "/notes": NotesIcon,
  "/uses": UsesIcon,
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
          const Icon = ICONS[item.href] ?? HomeIcon;
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
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  color: isActive ? "#FF4500" : "var(--text-dim)",
                  transition: "color 0.15s ease",
                }}
              >
                <Icon active={isActive} />
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
