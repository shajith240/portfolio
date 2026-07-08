"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import { useTheme } from "@/contexts/ThemeContext";

// Mirror the icon mapping from Dock.tsx
const ICON_FILE: Record<string, string> = {
  finder: "finder",
  "/about": "contact",
  "/projects": "projects",
  "/skills": "skills",
  "/dsa": "xcode",
  "/achievements": "achievements",
  "/education": "education",
  "external:github": "github",
  "external:linkedin": "linkedin",
  "external:leetcode": "leetcode",
};

export default function AppSwitcher() {
  const { windows, bringToFront } = useWindowManager();
  const { isDarkTheme } = useTheme();

  const [isActive, setIsActive] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const ctrlPressedRef = useRef(false);

  // Open windows in RECENCY order (front-most first), like the real
  // switcher — index 0 is the current app, index 1 the previous one.
  const openWindows = [...windows]
    .filter((w) => !w.minimized)
    .sort((a, b) => b.zIndex - a.zIndex);
  const shouldRender = isActive && openWindows.length > 0;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const { ctrlKey, shiftKey } = e;

      // The working binding is Ctrl+` (Backquote): Chrome/Edge
      // reserve Ctrl+Tab for their own tab switching and never
      // deliver it to the page. Tab stays as a best-effort alias
      // (it does arrive in PWA/kiosk contexts). e.code makes the
      // backquote layout-independent.
      const isSwitchKey = e.code === "Backquote" || e.key === "Tab";
      if (ctrlKey && isSwitchKey) {
        e.preventDefault();
        if (!isActive) {
          setIsActive(true);
          ctrlPressedRef.current = true;
          // macOS semantics: the first press highlights the PREVIOUS
          // app, not the one already in front.
          setHighlightedIndex(openWindows.length > 1 ? 1 : 0);
        } else {
          // Every further press cycles (Shift reverses) — including
          // repeat presses of `, not just the browser-eaten Tab.
          // (The original build only advanced on Tab, so Ctrl+`
          // opened the strip and then appeared dead.)
          setHighlightedIndex((prev) => {
            const next = shiftKey
              ? (prev - 1 + openWindows.length) % openWindows.length
              : (prev + 1) % openWindows.length;
            return next;
          });
        }
        return;
      }

      // Escape cancels
      if (isActive && e.key === "Escape") {
        setIsActive(false);
        ctrlPressedRef.current = false;
        return;
      }
    },
    [isActive, openWindows.length]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Control" && isActive && ctrlPressedRef.current) {
        // Ctrl released: bring highlighted window to front and hide switcher
        ctrlPressedRef.current = false;
        const selectedWindow = openWindows[highlightedIndex];
        if (selectedWindow) {
          bringToFront(selectedWindow.id);
        }
        setIsActive(false);
      }
    },
    [isActive, highlightedIndex, openWindows, bringToFront]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Reset highlight when switcher is deactivated
  useEffect(() => {
    if (!isActive) {
      setHighlightedIndex(0);
    }
  }, [isActive]);

  if (!shouldRender) return null;

  const panelBg = isDarkTheme ? "rgba(30,30,32,0.6)" : "rgba(240,240,242,0.6)";
  const panelBorder = isDarkTheme
    ? "rgba(255,255,255,0.1)"
    : "rgba(0,0,0,0.08)";
  const highlightBg = "rgba(255,255,255,0.16)";
  const labelColor = "rgba(255,255,255,0.85)";

  return (
    <AnimatePresence>
      <motion.div
        key="app-switcher-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12, ease: "easeOut" }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 5000,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "12px",
            padding: "22px",
            borderRadius: "26px",
            background: panelBg,
            backdropFilter: "blur(50px) saturate(180%)",
            WebkitBackdropFilter: "blur(50px) saturate(180%)",
            border: `1px solid ${panelBorder}`,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            pointerEvents: "auto",
          }}
        >
          {openWindows.map((window, index) => {
            const isHighlighted = index === highlightedIndex;
            const iconName = ICON_FILE[window.route] || "react";

            return (
              <div
                key={window.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "12px",
                  position: "relative",
                }}
              >
                {/* Highlight pill — a PLAIN div, deliberately not a
                    layoutId motion element: Framer's shared-layout
                    spring re-rendered the pill across the heavy
                    backdrop blur on every keypress, which read as
                    lag. Real macOS snaps the highlight instantly. */}
                {isHighlighted && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-10px",
                      left: "-10px",
                      right: "-10px",
                      bottom: "-10px",
                      background: highlightBg,
                      borderRadius: "14px",
                      zIndex: -1,
                    }}
                  />
                )}

                {/* Icon */}
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <img
                    src={`/icons/${iconName}.png`}
                    alt={window.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                </div>

                {/* Label */}
                <div
                  style={{
                    maxWidth: "90px",
                    textAlign: "center",
                    color: labelColor,
                    fontSize: "12px",
                    fontWeight: "500",
                    lineHeight: "1.2",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    zIndex: 1,
                  }}
                >
                  {window.title}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
