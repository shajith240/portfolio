"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { WIDGET_RADIUS } from "@/lib/widgetGrid";
import { getSizeDimensions } from "@/lib/widgetSizeTiers";
import type { WidgetSize } from "@/lib/widgetLayoutSchema";

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
   it.

   Card height is pinned to COMPACT_CARD_HEIGHT (widgetGrid.ts) —
   the same fixed height as AIToolsWidget directly below it in
   RightWidgetStack. This content's natural height is only ~97px,
   well under that; rather than pad it out asymmetrically or leave it
   sitting shorter than its neighbor (a real, measured ~43px mismatch
   that made the two-widget column look unpaired), the content is
   centered vertically in the fixed frame — matching how real Apple
   widgets center shorter content in a fixed size class instead of
   top-packing it. */

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

export default function ClockWidget({ size }: { size: WidgetSize }) {
  const now = useLiveClock();
  const dims = getSizeDimensions("clock", size);

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

  // Small: time only, no day/date — matches real Apple Clock
  // widget's own small size (single glanceable fact, per HIG's
  // small=single-focus rule). Font scaled down proportionally from
  // medium's 76px by the width ratio (155/260) — same Inter Tight
  // Medium already chosen for this widget, not a new font.
  const timeFontSize = size === "small" ? 44 : size === "large" ? 88 : 76;

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={ENTRANCE_SPRING}
      style={{
        position: "relative",
        width: `${dims.width}px`,
        height: dims.height ? `${dims.height}px` : undefined,
        padding: size === "small" ? "16px" : "0 18px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        borderRadius: `${WIDGET_RADIUS}px`,
        // Blue glass tint anchored to Apple's actual systemBlue —
        // #0A84FF (dark mode), the widely-used community-measured
        // value; Apple doesn't publish official hex codes since its
        // system colors are adaptive by design, but this is the de
        // facto reference every design system built against Apple's
        // palette uses. Lightened for the top-left specular highlight,
        // deepened for the bottom-right glass falloff — one hue
        // family, not an unrelated second color guessed at.
        //
        // Opacity landed at 0.68/0.78 after two wrong turns: 0.55/0.65
        // let a busy wallpaper muddy the blue into gray; 0.85/0.92
        // (this codebase's "thick glass" tier — reserved for
        // large TRANSIENT surfaces like modals) went too far the other
        // way and killed the translucency, reading as solid painted
        // metal instead of glass. This widget is a persistent desktop
        // widget, not a transient overlay, so it belongs at "Regular
        // Glass" tier — the same ~0.78 opacity already validated on
        // every other widget on this desktop (PhotoWidget,
        // NowPlayingWidget, AIToolsWidget all use --glass-regular-bg).
        // Enough fill to keep the hue readably blue, low enough that
        // backdrop-filter's blur is still visibly doing something.
        background: "linear-gradient(165deg, rgba(100, 176, 255, 0.68) 0%, rgba(10, 82, 190, 0.78) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        backdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
        WebkitBackdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.14)",
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

      {/* 1 — the time. Heavy, huge, glass. Inter Tight at Medium (500)
          — picked directly for its tighter, taller, slimmer digit
          proportions after Nunito (too round/bubbly), Inter (right
          overall SF Pro match but numerals too wide/short), and Geist
          (closer, still not quite it) were each tried and replaced.

          tabular-nums is confirmed correct — Apple's own Clock app
          uses monospaced/tabular figures specifically so the display
          doesn't shift width as digits change. letterSpacing stays at
          0 (not tightened) — large display numerals need room to
          breathe, not compression. */}
      <p
        className="glass-clock-time"
        style={{
          position: "relative",
          margin: 0,
          fontFamily: "var(--font-inter-tight), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          fontWeight: 500,
          fontSize: `${timeFontSize}px`,
          lineHeight: 0.95,
          letterSpacing: "0",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {timeLabel}
      </p>

      {size !== "small" && (
        <>
          {/* 2 — the day, handwritten script, overlapping the numerals'
              lower half (not just touching the bottom edge — the
              reference overlap cuts well into the digits). No rotation:
              flush left, same starting edge as the time above it. zIndex
              keeps the script above the glass digits. */}
          <p
            style={{
              position: "relative",
              zIndex: 1,
              margin: "-30px 0 0 0",
              fontFamily: "var(--font-caveat), cursive",
              fontWeight: 600,
              fontSize: "36px",
              lineHeight: 1,
              // Same systemBlue family as the card itself, deepened for
              // contrast against the lighter glass — a monochrome-blue
              // read, not white-on-blue (which is what an earlier version
              // had, before checking against the reference).
              color: "rgba(30, 75, 190, 0.95)",
              textShadow: "0 1px 3px rgba(255, 255, 255, 0.25)",
            }}
          >
            {dayLabel}
          </p>

          {/* 3 — the date, small caps. Same systemBlue family as the day
              script above it — one coherent tint for all the widget's own
              content (matching WidgetKit's "accented" rendering mode:
              content tinted a single deliberate color against the themed
              glass), not white text sitting on a blue card. Same font as
              the time display too (Inter Tight) — small/letter-spaced/bold
              instead of huge, so the two read as one considered type
              system instead of unrelated fonts bolted together. */}
          <p
            style={{
              position: "relative",
              margin: "6px 0 0 0",
              fontFamily: "var(--font-inter-tight), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.16em",
              color: "rgba(40, 90, 200, 0.9)",
            }}
          >
            {dateLabel}
          </p>
        </>
      )}
    </motion.div>
  );
}
