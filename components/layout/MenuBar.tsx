"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLayout } from "@/contexts/LayoutContext";
import { NAV_ITEMS } from "@/data/nav";

/* Top macOS-style menu bar. No Apple logo (explicit call). Page name is
   decorative for now — no dropdown functionality yet, per instruction to
   build the UI before wiring behavior. Spotlight search replaces
   BottomToolbar's search trigger. No Control Center — it only ever held
   a sound toggle (no sound-effects system to toggle) and a light/dark
   toggle (the site is dark-only by design); once both were removed
   there was nothing left in the dropdown, so the whole button/panel
   went too rather than leaving an empty menu that opens to nothing. */

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
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
  const { openSearch } = useLayout();
  const now = useClock();

  const pageName = NAV_ITEMS.find((item) => item.href === pathname)?.label ?? "Home";

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
      </div>
    </div>
  );
}
