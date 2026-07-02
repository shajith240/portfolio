"use client";

import { motion } from "framer-motion";
import { AI_TOOLS } from "@/data/aiTools";
import { WIDGET_UNIT, WIDGET_PADDING, WIDGET_RADIUS, COMPACT_CARD_HEIGHT } from "@/lib/widgetGrid";

/* macOS "App Shortcuts" / Quick Access-style widget — a compact grid
   of app icons (real macOS widget gallery convention: icon-only, no
   text labels), here filled with the AI tools actually used most
   rather than system apps. Clicking an icon opens that tool's real
   site in a new tab, same "external link" pattern already used for
   GitHub/LinkedIn/LeetCode in the Dock — not an internal window,
   since these aren't part of this site.

   Icon sizing: measured the six source .icns extractions directly
   (public/icons/*.png) — each already draws its glyph on a rounded-
   square backing inset to ~80-82% of its own 1024x1024 canvas, with
   its own baked-in shadow (this is Apple's real macOS Big Sur+ icon
   template, not something these third-party assets got wrong). An
   earlier version wrapped each <img> in an extra `borderRadius: 22%,
   overflow: hidden` clip on the button itself — a redundant second
   mask on top of a shape the source image already clips, inset, and
   shadows on its own, which is also what real macOS widget icon
   grids do: render the app-icon asset edge-to-edge in its cell with
   no extra clip, since the asset's own padding already supplies the
   breathing room. Tile size went 52px -> 64px to better match a real
   small-widget icon-to-cell ratio (iOS 2x2 Quick Access widgets run
   icons closer to ~38% of the widget's own width; the old 52/260
   ratio was ~20%, visibly undersized against the reference).

   Grid wraps (flex-wrap) rather than assuming a fixed 2x2/2x4 layout
   — real macOS Quick Access widgets ARE fixed-size, but AI_TOOLS is
   explicitly expected to grow ("I'll add more later"), so a wrapping
   grid absorbs that growth without needing a redesign each time an
   entry is added. */

const ICON_SIZE = 64;
const ENTRANCE_SPRING = { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 } as const;

export default function AIToolsWidget() {
  return (
    <motion.div
      className="glass-hero-refraction"
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={ENTRANCE_SPRING}
      style={{
        width: `${WIDGET_UNIT}px`,
        height: `${COMPACT_CARD_HEIGHT}px`,
        padding: `${WIDGET_PADDING}px`,
        borderRadius: `${WIDGET_RADIUS}px`,
        background: "var(--glass-regular-bg)",
        border: "1px solid var(--glass-border)",
        display: "flex",
        alignItems: "center",
        // Tight, close-to-surface shadow — see PhotoWidget.tsx for why
        // (a wide blur bleeds past the stack's 14px inter-widget gap).
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "center", width: "100%" }}>
        {AI_TOOLS.map((tool) => (
          <motion.button
            key={tool.name}
            onClick={() => window.open(tool.url, "_blank", "noopener,noreferrer")}
            title={tool.name}
            aria-label={tool.name}
            whileTap={{ scale: 0.9 }}
            style={{
              width: `${ICON_SIZE}px`,
              height: `${ICON_SIZE}px`,
              padding: 0,
              border: "none",
              background: "none",
              cursor: "pointer",
            }}
          >
            <img
              src={`/icons/${tool.file}.png`}
              alt={tool.name}
              draggable={false}
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
