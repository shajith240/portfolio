"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useLayout } from "@/contexts/LayoutContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useClickSound } from "@/lib/useClickSound";

/*
  Physical layout constants — must match LeftSidebar and RightNav exactly.
  LeftSidebar: left: 20px, width: 360px  → right edge at 380px
  RightNav:    right: 20px, width: 480px → from-right edge at 500px
*/
const SIDEBAR_RIGHT_EDGE = 20 + 360; // 380
const NAV_FROM_RIGHT     = 20 + 480; // 500
const GAP = 16;

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
  const { isNavOpen, isSidebarOpen, isSearchOpen: _, openSearch, isSoundEnabled, toggleSound } = useLayout();
  const { isDarkTheme, toggleTheme } = useTheme();
  const playClick = useClickSound(isSoundEnabled);
  const [soundHovered, setSoundHovered] = useState(false);
  const [searchHovered, setSearchHovered] = useState(false);

  /*
    Position the toolbar using the physical panel edges, not the canvas offsets.
    This ensures the buttons always sit just outside the sidebar/nav panels,
    never on top of them.
  */
  const leftPos  = isSidebarOpen ? SIDEBAR_RIGHT_EDGE + GAP : 32;
  const rightPos = isNavOpen     ? NAV_FROM_RIGHT     + GAP : 32;

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
            backgroundColor: "var(--toolbar-btn-bg)",
            border: "1px solid var(--toolbar-btn-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            padding: 0,
            color: soundHovered
              ? "#FF4500"
              : isSoundEnabled
              ? "var(--toolbar-icon-active)"
              : "var(--toolbar-icon-inactive)",
            transition: "color 0.15s ease, background-color 0.22s ease, border-color 0.22s ease",
          }}
        >
          {isSoundEnabled ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
        </button>

        {/* Theme toggle pill */}
        <div style={{
          display: "flex",
          backgroundColor: "var(--toolbar-btn-bg)",
          border: "1px solid var(--toolbar-btn-border)",
          borderRadius: "999px",
          padding: "3px",
          gap: "2px",
          transition: "background-color 0.22s ease, border-color 0.22s ease",
        }}>
          {/* Light (sun) */}
          <button
            onClick={() => { playClick(); if (isDarkTheme) toggleTheme(); }}
            title="Light theme"
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              backgroundColor: !isDarkTheme ? "var(--toolbar-pill-active)" : "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              color: !isDarkTheme ? "var(--toolbar-icon-active)" : "var(--toolbar-icon-inactive)",
              transition: "background-color 0.15s ease, color 0.15s ease",
            }}
          >
            <SunIcon />
          </button>

          {/* Dark (moon) */}
          <button
            onClick={() => { playClick(); if (!isDarkTheme) toggleTheme(); }}
            title="Dark theme"
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              backgroundColor: isDarkTheme ? "var(--toolbar-pill-active)" : "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              color: isDarkTheme ? "var(--toolbar-icon-active)" : "var(--toolbar-icon-inactive)",
              transition: "background-color 0.15s ease, color 0.15s ease",
            }}
          >
            <MoonIcon />
          </button>
        </div>
      </div>

      {/* Right — command palette trigger */}
      <button
        onClick={() => { playClick(); openSearch(); }}
        onMouseEnter={() => setSearchHovered(true)}
        onMouseLeave={() => setSearchHovered(false)}
        style={{
          backgroundColor: "var(--toolbar-search-bg)",
          border: "1px solid var(--toolbar-search-border)",
          borderRadius: "999px",
          padding: "8px 14px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
          color: searchHovered ? "#FF4500" : "var(--text-muted)",
          transition: "color 0.15s ease, background-color 0.22s ease, border-color 0.22s ease",
        }}
      >
        <SearchIcon />
        <span style={{
          fontSize: "12px",
          color: "var(--toolbar-search-text)",
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
