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
        padding: "16px 16px 14px",
        borderRadius: "20px",
        // Blue glass tint anchored to Apple's actual systemBlue —
        // #0A84FF (dark mode), the widely-used community-measured
        // value; Apple doesn't publish official hex codes since its
        // system colors are adaptive by design, but this is the de
        // facto reference every design system built against Apple's
        // palette uses. Lightened for the top-left specular highlight,
        // deepened for the bottom-right glass falloff — one hue
        // family, not an unrelated second color guessed at.
        background: "linear-gradient(165deg, rgba(90, 170, 255, 0.55) 0%, rgba(10, 90, 200, 0.65) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.18)",
        backdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
        WebkitBackdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
        overflow: "hidden",
        // Left-aligned, not centered — the time, day, and date all
        // start from the same left edge. An earlier version centered
        // everything and rotated the day text; both were wrong. The
        // reference photo itself was shot at a slight tilt, which read
        // as "the design is rotated" — it isn't; every line shares one
        // flush-left starting point.
        textAlign: "left",
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
          background: "radial-gradient(120% 70% at 50% -10%, rgba(255, 255, 255, 0.16), transparent 60%)",
          pointerEvents: "none",
        }}
      />

      {/* 1 — the time. Heavy, huge, glass. Nunito is the standard free
          substitute for SF Pro Rounded (the real Lock Screen numeral
          face — a licensed Apple system font that can't legally be
          self-hosted for a public site): same rounded, friendly,
          heavy-weight geometric character. */}
      <p
        className="glass-clock-time"
        style={{
          position: "relative",
          margin: 0,
          fontFamily: "var(--font-nunito), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          fontWeight: 900,
          fontSize: "76px",
          lineHeight: 0.95,
          letterSpacing: "-0.01em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {timeLabel}
      </p>

      {/* 2 — the day, handwritten script, overlapping the numerals'
          lower half (not just touching the bottom edge — the
          reference overlap cuts well into the digits). No rotation:
          flush left, same starting edge as the time above it. zIndex
          keeps the script above the glass digits. */}
      <p
        style={{
          position: "relative",
          zIndex: 1,
          margin: "-38px 0 0 0",
          fontFamily: "var(--font-caveat), cursive",
          fontWeight: 600,
          fontSize: "36px",
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
