"use client";

import { useEffect, useState, useCallback } from "react";
import { useLayout } from "@/contexts/LayoutContext";
import { useWindowManager } from "@/contexts/WindowManagerContext";

/* macOS menu bar — Tahoe dark mode. Passive UI, no dropdowns.
   26px fixed bar at top, below widgets/windows but above Spotlight overlay.
   Left: ⌘ icon (about), "Shajith", menu items (File/Edit/View/Go/Window/Help)
   Right: Wi-Fi, Battery, Clock (date + time, 30s update interval)
   Hides on mobile (<768px). */

export default function MenuBar() {
  const { isMobileLayout, isTabletLayout } = useLayout();
  const { openWindow } = useWindowManager();
  const [time, setTime] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const isPhone = isMobileLayout && !isTabletLayout;

  // Update clock every 30 seconds
  useEffect(() => {
    if (isPhone) return;

    const updateTime = () => {
      const now = new Date();
      const dateFormatter = new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const timeFormatter = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      setDate(dateFormatter.format(now));
      setTime(timeFormatter.format(now));
    };

    updateTime(); // Set initial values
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, [isPhone]);

  const handleAboutClick = useCallback(() => {
    openWindow("/about", "About");
  }, [openWindow]);

  // Hide on mobile
  if (isPhone) return null;

  const menuItems = ["File", "Edit", "View", "Go", "Window", "Help"];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "26px",
        zIndex: 99, // Below CommandPalette (100/101), above everything else
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: "13px",
        paddingRight: "13px",
        background: "rgba(22, 22, 24, 0.55)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Left side menu items */}
      <div style={{ display: "flex", alignItems: "center", gap: "0px" }}>
        {/* App icon / mark — opens About window */}
        <button
          onClick={handleAboutClick}
          style={{
            border: "none",
            color: "rgba(255, 255, 255, 0.9)",
            fontSize: "15px",
            lineHeight: 1,
            cursor: "default",
            padding: "0 8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "4px",
            transition: "background 120ms ease-out",
            background: hoveredItem === "icon" ? "rgba(255, 255, 255, 0.12)" : "transparent",
          }}
          onMouseEnter={() => setHoveredItem("icon")}
          onMouseLeave={() => setHoveredItem(null)}
          aria-label="About"
        >
          ⌘
        </button>

        {/* App name */}
        <div
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "rgba(255, 255, 255, 0.9)",
            paddingLeft: "0px",
            paddingRight: "8px",
          }}
        >
          Shajith
        </div>

        {/* Menu items — no-op buttons (passive bar) */}
        {menuItems.map((item) => (
          <button
            key={item}
            style={{
              border: "none",
              color: "rgba(255, 255, 255, 0.9)",
              fontSize: "13px",
              fontWeight: 400,
              cursor: "default",
              padding: "0 8px",
              borderRadius: "4px",
              transition: "background 120ms ease-out",
              background: hoveredItem === item ? "rgba(255, 255, 255, 0.12)" : "transparent",
            }}
            onMouseEnter={() => setHoveredItem(item)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            {item}
          </button>
        ))}
      </div>

      {/* Right side: Wi-Fi, Battery, Clock */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        {/* Wi-Fi icon — 15px inline SVG */}
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255, 255, 255, 0.85)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <path d="M5 12.55a11 11 0 0 1 14.08 0" />
          <path d="M1.42 9a16 16 0 0 1 21.16 0" />
          <path d="M9 20h6" />
          <circle cx="12" cy="16" r="1" />
        </svg>

        {/* Battery icon — ~22×11, ~80% fill */}
        <svg
          width="22"
          height="11"
          viewBox="0 0 22 11"
          fill="none"
          stroke="rgba(255, 255, 255, 0.85)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          {/* Battery outline */}
          <rect x="0.5" y="0.5" width="19" height="10" rx="2" ry="2" fill="none" />
          {/* Nipple on right */}
          <rect x="20" y="3" width="1.5" height="5" rx="0.5" ry="0.5" fill="rgba(255, 255, 255, 0.85)" />
          {/* Fill ~80% */}
          <rect x="1.5" y="1.5" width="15.2" height="8" rx="1" ry="1" fill="rgba(255, 255, 255, 0.85)" />
        </svg>

        {/* Clock: date (Sat Jul 5) and time (11:32 AM) — updates every 30s */}
        <div
          style={{
            fontSize: "13px",
            fontWeight: 400,
            color: "rgba(255, 255, 255, 0.9)",
            minWidth: "90px",
            textAlign: "right",
            lineHeight: 1.2,
          }}
        >
          <div>{date}</div>
          <div>{time}</div>
        </div>
      </div>
    </div>
  );
}
