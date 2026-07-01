"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/* macOS/iOS Lock Screen-style Clock widget, matching the reference
   layout exactly, top to bottom:

     1. The time — huge, extra-heavy numerals rendered as translucent
        glass (the wallpaper glows through the letterforms; see
        .glass-clock-time in globals.css, and its note on why
        backdrop-filter can never be part of that recipe).
     2. The day name — handwritten script (Caveat, loaded in
        layout.tsx), white, deliberately overlapping the bottom edge
        of the numerals rather than stacked politely below them.
     3. The date — small, letter-spaced caps.

   An earlier version had these layers in the wrong order (day/date
   header above a boxed time) which is exactly why it didn't look
   like the reference at all — the drama of this widget is the time
   dominating the full card width with the script day scrawled across
   it. */

const WIDGET_WIDTH = 260;
const ENTRANCE_SPRING = { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 } as const;

function useLiveClock() {
  // SSR-safe: null until mounted (matches MenuBar.tsx's useClock), then
  // ticks every second — never renders a server-guessed time that
  // could mismatch the client's actual clock at hydration.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function ClockWidget() {
  const now = useLiveClock();

  // Locale/options pinned explicitly — same convention as everywhere
  // else dates are formatted on this site (see CurrentlyBuildingWidget
  // history). `now` starts null and only resolves client-side, so
  // there's no hydration risk either way; pinning just keeps the
  // convention uniform.
  const timeLabel = now
    ? now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
    : "--:--";
  const dayLabel = now ? now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase() : "";
  const dateLabel = now ? now.toLocaleDateString("en-US", { month: "long", day: "numeric" }).toUpperCase() : "";

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={ENTRANCE_SPRING}
      style={{
        position: "relative",
        width: `${WIDGET_WIDTH}px`,
        padding: "16px 14px 14px",
        borderRadius: "20px",
        background: "var(--glass-regular-bg)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
        WebkitBackdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        overflow: "hidden",
        textAlign: "center",
      }}
    >
      {/* Soft top-light bloom behind everything — the layer between the
          card material and the type that keeps the glass numerals from
          sitting on a flat tint. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(120% 70% at 50% -10%, rgba(255, 255, 255, 0.10), transparent 60%)",
          pointerEvents: "none",
        }}
      />

      {/* 1 — the time. Heavy, huge, glass. */}
      <p
        className="glass-clock-time"
        style={{
          position: "relative",
          margin: 0,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Rounded', system-ui, sans-serif",
          fontWeight: 800,
          fontSize: "78px",
          lineHeight: 0.95,
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {timeLabel}
      </p>

      {/* 2 — the day, handwritten, scrawled across the numerals' bottom
          edge (negative margin = the overlap in the reference, not a
          polite stack). zIndex keeps the script above the glass
          digits. */}
      <p
        style={{
          position: "relative",
          zIndex: 1,
          margin: "-22px 0 0 0",
          fontFamily: "var(--font-caveat), cursive",
          fontWeight: 600,
          fontSize: "34px",
          lineHeight: 1,
          color: "rgba(255, 255, 255, 0.95)",
          textShadow: "0 1px 6px rgba(0, 0, 0, 0.35)",
        }}
      >
        {dayLabel}
      </p>

      {/* 3 — the date, small caps. */}
      <p
        style={{
          position: "relative",
          margin: "4px 0 0 0",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.16em",
          color: "rgba(255, 255, 255, 0.72)",
        }}
      >
        {dateLabel}
      </p>
    </motion.div>
  );
}
