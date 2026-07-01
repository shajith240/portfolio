"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { UPDATES } from "@/data/updates";

/* macOS "Stickies"-style widget for the site's own changelog. Reads
   UPDATES[0] only (newest-first array, manually maintained) — no
   in-widget history/pagination. See
   docs/superpowers/specs/2026-07-01-desktop-widgets-design.md.

   Deliberately NOT using Framer's `layout` prop for the hover reveal —
   see the equivalent note in NowPlayingWidget.tsx: `layout` scales the
   whole subtree (including text) via a transform while the box's
   height is changing, which visibly stretches text for the
   animation's duration. The date line below is height-animated via a
   real motion value on an always-rendered, overflow-hidden wrapper
   instead — nothing is ever scaled. The blurb's own truncated↔wrapped
   switch stays a plain, instant style toggle (ellipsis/white-space
   aren't CSS-animatable either way, so there's nothing to smooth
   there). */

const WIDGET_WIDTH = 260;
const ENTRANCE_SPRING = { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 } as const;

function HammerGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M14.5 6.5L18 3L21 6L17.5 9.5" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2.5" y="14" width="14" height="5" rx="1.2" transform="rotate(-45 2.5 14)" fill="rgba(255,255,255,0.9)" />
      <path d="M13 8L16.5 11.5" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function formatUpdateDate(iso: string): string {
  // Explicit locale + options, not a bare toLocaleDateString() — an
  // unpinned locale can render differently between Next.js's server
  // render and the browser, which is a hydration mismatch, not just
  // a cosmetic risk.
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function CurrentlyBuildingWidget() {
  const [hovered, setHovered] = useState(false);
  const latest = UPDATES[0];
  const dateRef = useRef<HTMLParagraphElement>(null);
  const dateHeight = useMotionValue(0);

  useEffect(() => {
    const target = hovered ? (dateRef.current?.scrollHeight ?? 0) : 0;
    const controls = animate(dateHeight, target, ENTRANCE_SPRING);
    return () => controls.stop();
  }, [hovered, dateHeight]);

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={ENTRANCE_SPRING}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: `${WIDGET_WIDTH}px`,
        padding: "14px",
        borderRadius: "20px",
        background: "var(--glass-regular-bg)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
        WebkitBackdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
        boxShadow: "0 16px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <div
          style={{
            width: "44px",
            height: "44px",
            flexShrink: 0,
            borderRadius: "22%",
            background: "linear-gradient(160deg, #FF7A45 0%, #7A1F00 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <HammerGlyph />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: "0 0 3px 0", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
            {latest.title}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              color: "var(--text-muted)",
              lineHeight: 1.4,
              whiteSpace: hovered ? "normal" : "nowrap",
              overflow: "hidden",
              textOverflow: hovered ? "clip" : "ellipsis",
            }}
          >
            {latest.blurb}
          </p>
          {/* Always rendered, height-clipped via a real motion value —
              paddingTop (not the paragraph's own margin) carries the
              6px gap, since a child's top margin can collapse into
              this wrapper and silently vanish from scrollHeight. */}
          <motion.div style={{ height: dateHeight, overflow: "hidden" }}>
            <p ref={dateRef} style={{ margin: 0, paddingTop: "6px", fontSize: "10px", color: "var(--text-ghost)" }}>
              {formatUpdateDate(latest.date)}
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
