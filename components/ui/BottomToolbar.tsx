"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useLayout } from "@/contexts/LayoutContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useShellMetrics } from "@/lib/useShellMetrics";

/*
  Physical layout constants — must match LeftSidebar exactly.
  LeftSidebar: left: 20px, width: 360px  → right edge at 380px
  (RightNav removed in a prior session)
*/

/* ── Icons ───────────────────────────────────────────────────────── */

const SpeakerOnIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

const SpeakerOffIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

const SunIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

/* ── Component ───────────────────────────────────────────────────── */

export default function BottomToolbar() {
  const { openSearch, isSoundEnabled, toggleSound, isMobileLayout, isTabletLayout } = useLayout();
  const { isDarkTheme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const metrics = useShellMetrics();
  const [soundHovered, setSoundHovered] = useState(false);
  const [searchHovered, setSearchHovered] = useState(false);
  const forceDarkChrome = pathname === "/dsa";
  const toolbarButtonBg = forceDarkChrome ? "#1a1a1a" : "var(--toolbar-btn-bg)";
  const toolbarButtonBorder = forceDarkChrome ? "#333333" : "var(--toolbar-btn-border)";
  const toolbarSearchBg = forceDarkChrome ? "#242424" : "var(--toolbar-search-bg)";
  const toolbarSearchBorder = forceDarkChrome ? "rgba(255, 255, 255, 0.12)" : "var(--toolbar-search-border)";
  const toolbarPillActive = forceDarkChrome ? "#2c2c2c" : "var(--toolbar-pill-active)";
  const toolbarIconActive = forceDarkChrome ? "rgba(255, 255, 255, 0.70)" : "var(--toolbar-icon-active)";
  const toolbarIconInactive = forceDarkChrome ? "#555555" : "var(--toolbar-icon-inactive)";
  const toolbarSearchText = forceDarkChrome ? "#888888" : "var(--toolbar-search-text)";
  const toolbarSearchIcon = forceDarkChrome ? "#888888" : "var(--text-muted)";

  /*
    Position the toolbar using the physical panel edges, not the canvas offsets.
    On desktop (≥ 1024px): sidebar 360px at left:20 → right edge 380; nav 480px at right:20 → from-right 500.
    On tablet (640–1023px): panels are full-height overlays — toolbar stays at 16px edges.
    On phone (< 640px): same as tablet — panels overlay, toolbar stays at 16px.
  */
  const isPhone = isMobileLayout && !isTabletLayout;
  const leftPos = metrics.toolbarLeft;
  const rightPos = metrics.toolbarRight;

  // Phone uses MobileTabBar — hide the desktop toolbar entirely
  if (isPhone) return null;

  return (
    <motion.div
      animate={{ left: `${leftPos}px`, right: `${rightPos}px` }}
      transition={{ type: "spring", stiffness: 520, damping: 44, mass: 0.85 }}
      style={{
        position: "fixed",
        bottom: "28px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 100,
      }}
    >
      {/* Left — sound toggle + theme toggle pill */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>

        {/* Sound toggle */}
        <button
          onClick={toggleSound}
          onMouseEnter={() => setSoundHovered(true)}
          onMouseLeave={() => setSoundHovered(false)}
          title={isSoundEnabled ? "Mute sounds" : "Unmute sounds"}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            backgroundColor: toolbarButtonBg,
            border: `1px solid ${toolbarButtonBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            padding: 0,
            color: soundHovered
              ? "#FF4500"
              : isSoundEnabled
              ? toolbarIconActive
              : toolbarIconInactive,
            transition: "color 0.15s ease, background-color 0.22s ease, border-color 0.22s ease",
          }}
        >
          {isSoundEnabled ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
        </button>

        {/* Theme toggle pill */}
        <div style={{
          display: "flex",
          backgroundColor: toolbarButtonBg,
          border: `1px solid ${toolbarButtonBorder}`,
          borderRadius: "999px",
          padding: "3px",
          gap: "2px",
          transition: "background-color 0.22s ease, border-color 0.22s ease",
        }}>
          {/* Light (sun) */}
          <button
            onClick={() => { if (isDarkTheme) toggleTheme(); }}
            title="Light theme"
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              backgroundColor: !isDarkTheme ? toolbarPillActive : "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              color: !isDarkTheme ? toolbarIconActive : toolbarIconInactive,
              transition: "background-color 0.15s ease, color 0.15s ease",
            }}
          >
            <SunIcon />
          </button>

          {/* Dark (moon) */}
          <button
            onClick={() => { if (!isDarkTheme) toggleTheme(); }}
            title="Dark theme"
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              backgroundColor: isDarkTheme ? toolbarPillActive : "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              color: isDarkTheme ? toolbarIconActive : toolbarIconInactive,
              transition: "background-color 0.15s ease, color 0.15s ease",
            }}
          >
            <MoonIcon />
          </button>
        </div>
      </div>

      {/* Right — command palette trigger */}
      <button
        onClick={openSearch}
        onMouseEnter={() => setSearchHovered(true)}
        onMouseLeave={() => setSearchHovered(false)}
        style={{
          backgroundColor: toolbarSearchBg,
          border: `1px solid ${toolbarSearchBorder}`,
          borderRadius: "999px",
          padding: "8px 14px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
          color: searchHovered ? "#FF4500" : toolbarSearchIcon,
          transition: "color 0.15s ease, background-color 0.22s ease, border-color 0.22s ease",
        }}
      >
        <SearchIcon />
        <span style={{
          fontSize: "12px",
          color: toolbarSearchText,
          fontFamily: "ui-monospace, 'SF Mono', monospace",
          letterSpacing: "0.04em",
          transition: "color 0.22s ease",
        }}>
          ⌘K
        </span>
      </button>
    </motion.div>
  );
}
