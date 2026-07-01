"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useLayout } from "@/contexts/LayoutContext";
import { useTheme } from "@/contexts/ThemeContext";
import { NAV_ITEMS } from "@/data/nav";

/* Top macOS-style menu bar. No Apple logo (explicit call). Page name is
   decorative for now — no dropdown functionality yet, per instruction to
   build the UI before wiring behavior. Control Center + Spotlight replace
   BottomToolbar's sound/theme toggle and search trigger. */

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
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

// Two overlapping sliders — mirrors the real macOS Control Center glyph.
const ControlCenterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="8" x2="20" y2="8" />
    <circle cx="15" cy="8" r="2.4" fill="currentColor" stroke="none" />
    <line x1="4" y1="16" x2="20" y2="16" />
    <circle cx="9" cy="16" r="2.4" fill="currentColor" stroke="none" />
  </svg>
);

function useClock() {
  // SSR-safe: render nothing meaningful until mounted, then tick every second.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function MenuBar() {
  const pathname = usePathname();
  const { isSoundEnabled, toggleSound, openSearch } = useLayout();
  const { isDarkTheme, toggleTheme } = useTheme();
  const [controlCenterOpen, setControlCenterOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const now = useClock();

  const pageName = NAV_ITEMS.find((item) => item.href === pathname)?.label ?? "Home";

  useEffect(() => {
    if (!controlCenterOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      // Exclude the toggle button itself — otherwise this mousedown
      // handler closes the panel first, then the button's own onClick
      // (which fires after mousedown) immediately toggles it back open,
      // so a second click on the button appeared to do nothing.
      if (
        panelRef.current && !panelRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
        setControlCenterOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [controlCenterOpen]);

  const timeLabel = now
    ? now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        height: "30px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        background: "var(--glass-thin-bg)",
        borderBottom: "0.5px solid var(--glass-border)",
        backdropFilter: "blur(var(--glass-blur-thin)) saturate(var(--glass-saturate))",
        WebkitBackdropFilter: "blur(var(--glass-blur-thin)) saturate(var(--glass-saturate))",
        fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
        {pageName}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: "16px", position: "relative" }}>
        <button
          ref={buttonRef}
          onClick={() => setControlCenterOpen((v) => !v)}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: controlCenterOpen ? "#FF4500" : "var(--text-primary)",
            display: "flex",
            transition: "color 0.15s ease",
          }}
          title="Control Center"
        >
          <ControlCenterIcon />
        </button>

        <button
          onClick={openSearch}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: "var(--text-primary)",
            display: "flex",
          }}
          title="Search"
        >
          <SearchIcon />
        </button>

        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", minWidth: "56px", textAlign: "right" }}>
          {timeLabel}
        </span>

        <AnimatePresence>
          {controlCenterOpen && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: "220px",
                padding: "14px",
                borderRadius: "16px",
                background: "var(--glass-regular-bg)",
                border: "1px solid var(--glass-border)",
                backdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
                WebkitBackdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
                boxShadow: "0 16px 40px rgba(0, 0, 0, 0.35)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <button
                onClick={toggleSound}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "var(--bg-hover)",
                  border: "none",
                  borderRadius: "10px",
                  padding: "8px 10px",
                  cursor: "pointer",
                  color: "var(--text-primary)",
                }}
              >
                {isSoundEnabled ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
                <span style={{ fontSize: "13px" }}>{isSoundEnabled ? "Sound On" : "Sound Off"}</span>
              </button>

              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={() => { if (isDarkTheme) toggleTheme(); }}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    background: !isDarkTheme ? "var(--bg-elevated)" : "var(--bg-hover)",
                    border: "none",
                    borderRadius: "10px",
                    padding: "8px 0",
                    cursor: "pointer",
                    color: "var(--text-primary)",
                  }}
                >
                  <SunIcon /> <span style={{ fontSize: "12px" }}>Light</span>
                </button>
                <button
                  onClick={() => { if (!isDarkTheme) toggleTheme(); }}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    background: isDarkTheme ? "var(--bg-elevated)" : "var(--bg-hover)",
                    border: "none",
                    borderRadius: "10px",
                    padding: "8px 0",
                    cursor: "pointer",
                    color: "var(--text-primary)",
                  }}
                >
                  <MoonIcon /> <span style={{ fontSize: "12px" }}>Dark</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
