"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/* macOS-style desktop Clock widget, built as a genuine Liquid Glass
   "hero surface" (see docs/design-system/materials-glass.md's
   enhanced-tier note — this is exactly the kind of standalone,
   high-visibility element that tier is meant for, not a card used
   everywhere).

   Three deliberate layers, matching what real Lock Screen clock
   customization actually does: an uppercase, letter-spaced day label
   (system font, small); a date line below it (system font, slightly
   larger); and the time itself in a genuinely different, distinctive
   display face (VG5000 — already loaded via next/font/local in
   layout.tsx as --font-vg5000/--font-body, but unused anywhere until
   now) at a much larger size, rendered as real frosted glass — the
   letterforms themselves show a blurred, brightened view of whatever
   is behind the widget, via .glass-clock-time in globals.css, not
   just a flat color sitting on a glass card. */

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

  // Locale/options pinned explicitly (same reasoning as
  // CurrentlyBuildingWidget's date formatting did) — an unpinned
  // locale can render differently between server and client renders,
  // which is a hydration mismatch, not just a cosmetic risk. Doesn't
  // actually matter here since `now` starts null and only resolves
  // client-side, but pinning costs nothing and keeps the convention
  // consistent everywhere dates are formatted on this site.
  const timeLabel = now
    ? now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
    : "--:--";
  const dayLabel = now ? now.toLocaleDateString("en-US", { weekday: "long" }) : "";
  const dateLabel = now ? now.toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "";

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={ENTRANCE_SPRING}
      style={{
        position: "relative",
        width: `${WIDGET_WIDTH}px`,
        padding: "22px 18px",
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
      {/* Inner glow — the "layers" a real glass surface has beyond
          just the outer card material, a soft light source bloom
          near the top rather than one flat tint. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(120% 70% at 50% -10%, rgba(255, 255, 255, 0.10), transparent 60%)",
          pointerEvents: "none",
        }}
      />

      <p
        style={{
          position: "relative",
          margin: "0 0 2px 0",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}
      >
        {dayLabel}
      </p>
      <p
        style={{
          position: "relative",
          margin: "0 0 8px 0",
          fontSize: "12.5px",
          fontWeight: 500,
          color: "var(--text-ghost)",
        }}
      >
        {dateLabel}
      </p>

      <p
        className="glass-clock-time"
        style={{
          position: "relative",
          margin: 0,
          fontFamily: "var(--font-body), system-ui, sans-serif",
          fontSize: "54px",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {timeLabel}
      </p>
    </motion.div>
  );
}
