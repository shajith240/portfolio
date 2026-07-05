"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { useHaptic } from "@/lib/useHaptic";
import { NAV_ITEMS } from "@/data/nav";

/* ── Tab icons (22px, Apple SF-style) ─────────────────────────────── */

const HomeIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    {!active && <polyline points="9,22 9,12 15,12 15,22" />}
  </svg>
);

const ProjectsIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const AboutIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const SkillsIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.5} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
  </svg>
);

const MoreIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
);

/* ── Tab definitions ─────────────────────────────────────────────── */

const TABS = [
  { id: "home", label: "Home", href: "/", Icon: HomeIcon },
  { id: "projects", label: "Projects", href: "/projects", Icon: ProjectsIcon },
  { id: "about", label: "About", href: "/about", Icon: AboutIcon },
  { id: "skills", label: "Skills", href: "/skills", Icon: SkillsIcon },
  { id: "more", label: "More", href: null, Icon: MoreIcon },
] as const;

/* ── Spring configs (Apple-native feel) ──────────────────────────── */

const SPRINGS = {
  dockEntrance: { type: "spring" as const, stiffness: 260, damping: 25, mass: 0.8, delay: 0.15 },
  indicatorSlide: { type: "spring" as const, stiffness: 350, damping: 30, mass: 0.8 },
  iconActivate: { type: "spring" as const, stiffness: 500, damping: 30 },
  tabPress: { type: "spring" as const, stiffness: 400, damping: 17 },
};

/* ── Full-screen nav overlay (Apple sheet style) ─────────────────── */

function NavOverlay({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const { isDarkTheme } = useTheme();
  const haptic = useHaptic();

  return (
    <>
      {/* Blur backdrop — lets content show through with frosted glass */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => { haptic("light"); onClose(); }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 199,
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          background: isDarkTheme
            ? "rgba(0, 0, 0, 0.4)"
            : "rgba(255, 255, 255, 0.3)",
        }}
      />

      {/* Sheet panel — slides up from bottom like Apple's share sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 36, mass: 0.9 }}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          background: isDarkTheme
            ? "rgba(28, 28, 30, 0.92)"
            : "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(40px) saturate(200%)",
          WebkitBackdropFilter: "blur(40px) saturate(200%)",
          borderRadius: "20px 20px 0 0",
          borderTop: isDarkTheme
            ? "1px solid rgba(255, 255, 255, 0.08)"
            : "1px solid rgba(0, 0, 0, 0.06)",
          borderLeft: isDarkTheme
            ? "1px solid rgba(255, 255, 255, 0.08)"
            : "1px solid rgba(0, 0, 0, 0.06)",
          borderRight: isDarkTheme
            ? "1px solid rgba(255, 255, 255, 0.08)"
            : "1px solid rgba(0, 0, 0, 0.06)",
          borderBottom: "none",
          maxHeight: "85dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "background 0.22s ease, border-color 0.22s ease",
        }}
      >
        {/* Grab handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{
            width: 36,
            height: 5,
            borderRadius: 3,
            background: isDarkTheme
              ? "rgba(255, 255, 255, 0.18)"
              : "rgba(0, 0, 0, 0.12)",
            transition: "background 0.22s ease",
          }} />
        </div>

        {/* Nav items */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.035, delayChildren: 0.1 } } }}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "8px 24px 0",
            overflowY: "auto",
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <motion.div
                key={item.href}
                variants={{
                  hidden: { opacity: 0, y: 16 },
                  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } },
                }}
              >
                <Link
                  href={item.href}
                  onClick={() => { haptic("light"); onClose(); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 8px",
                    textDecoration: "none",
                    borderBottom: "1px solid",
                    borderColor: isDarkTheme
                      ? "rgba(255, 255, 255, 0.06)"
                      : "rgba(0, 0, 0, 0.05)",
                    borderRadius: 0,
                    transition: "border-color 0.22s ease",
                  }}
                >
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      color: isActive ? "#0a84ff" : "var(--text-primary)",
                      letterSpacing: "-0.01em",
                      fontFamily: "system-ui, -apple-system, sans-serif",
                      transition: "color 0.22s ease",
                    }}
                  >
                    {item.label}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 12,
                        color: isActive ? "#0a84ff" : "var(--text-dim)",
                        fontFamily: "ui-monospace, 'SF Mono', monospace",
                        transition: "color 0.22s ease",
                      }}
                    >
                      {item.num}
                    </span>
                    {isActive && (
                      <div style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#0a84ff",
                        flexShrink: 0,
                      }} />
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

      </motion.div>
    </>
  );
}

/* ── Floating Dock ───────────────────────────────────────────────── */

export default function MobileTabBar() {
  const pathname = usePathname();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const { isDarkTheme } = useTheme();
  const haptic = useHaptic();

  const morePages = ["/dsa", "/notes", "/uses"];
  const isMoreActive = morePages.includes(pathname) || overlayOpen;

  return (
    <>
      {/* Full-screen overlay */}
      <AnimatePresence>
        {overlayOpen && <NavOverlay onClose={() => setOverlayOpen(false)} />}
      </AnimatePresence>

      {/* Floating dock — outer wrapper centers, inner motion.nav animates */}
      <div
        style={{
          position: "fixed",
          bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          left: 0,
          right: 0,
          zIndex: 150,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <motion.nav
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={SPRINGS.dockEntrance}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            padding: "5px 6px",
            borderRadius: 24,
            background: isDarkTheme
              ? "rgba(28, 28, 30, 0.78)"
              : "rgba(255, 255, 255, 0.78)",
            backdropFilter: "saturate(180%) blur(24px)",
            WebkitBackdropFilter: "saturate(180%) blur(24px)",
            border: isDarkTheme
              ? "0.5px solid rgba(255, 255, 255, 0.10)"
              : "0.5px solid rgba(0, 0, 0, 0.06)",
            transition: "background 0.22s ease, border-color 0.22s ease",
            pointerEvents: "auto",
          }}
        >
          <LayoutGroup>
            {TABS.map((tab) => {
              const isActive = tab.href ? pathname === tab.href : isMoreActive;
              const isMoreTab = tab.id === "more";

              const handleClick = () => {
                haptic(isMoreTab ? "medium" : "light");
                if (isMoreTab) setOverlayOpen(true);
              };

              const tabContent = (
                <motion.div
                  whileTap={{ scale: 0.82 }}
                  transition={SPRINGS.tabPress}
                  style={{
                    position: "relative",
                    width: 56,
                    height: 46,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 3,
                    borderRadius: 16,
                    cursor: "pointer",
                    zIndex: 1,
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {/* Sliding active indicator pill */}
                  {isActive && (
                    <motion.div
                      layoutId="dockActiveIndicator"
                      transition={SPRINGS.indicatorSlide}
                      style={{
                        position: "absolute",
                        inset: 3,
                        borderRadius: 13,
                        background: isDarkTheme
                          ? "rgba(10, 132, 255, 0.12)"
                          : "rgba(10, 132, 255, 0.08)",
                        zIndex: -1,
                        transition: "background 0.22s ease",
                      }}
                    />
                  )}

                  {/* Icon */}
                  <motion.div
                    animate={isActive
                      ? { scale: 1.1, y: -0.5 }
                      : { scale: 1, y: 0 }
                    }
                    transition={SPRINGS.iconActivate}
                    style={{
                      color: isActive ? "#0a84ff" : "var(--text-dim)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "color 0.15s ease",
                    }}
                  >
                    <tab.Icon active={isActive} />
                  </motion.div>

                  {/* Label */}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? "#0a84ff" : "var(--text-dim)",
                      letterSpacing: "0.01em",
                      lineHeight: 1,
                      transition: "color 0.15s ease",
                    }}
                  >
                    {tab.label}
                  </span>
                </motion.div>
              );

              if (isMoreTab) {
                return (
                  <button
                    key={tab.id}
                    onClick={handleClick}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      margin: 0,
                      cursor: "pointer",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {tabContent}
                  </button>
                );
              }

              return (
                <Link
                  key={tab.id}
                  href={tab.href!}
                  onClick={() => haptic("light")}
                  style={{
                    textDecoration: "none",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {tabContent}
                </Link>
              );
            })}
          </LayoutGroup>
        </motion.nav>
      </div>
    </>
  );
}
