"use client";

import { motion } from "framer-motion";
import { WIDGET_RADIUS } from "@/lib/widgetGrid";
import type { WidgetSize } from "@/lib/widgetLayoutSchema";

/* macOS "Photos" widget — a single photo, edge to edge, no text.
   Liquid Glass isn't appropriate here (a photo widget is opaque, not
   translucent, in real macOS) — just a squircle-clipped image with a
   soft shadow. See docs/design-system/materials-glass.md.

   All 3 size tiers show the same source photo with more visible at
   larger sizes — matches Apple's real Photos widget, which crops the
   same source image tighter or looser per size rather than changing
   layout.

   Shadow is deliberately tight (small blur/offset), not a big diffuse
   glow: real macOS desktop widgets rest close to the surface rather
   than levitating dramatically. */

// Shared entrance spring (same as the other widget cards) — one
// motion signature across the family. No hover scale/lift: real
// macOS desktop widgets don't react to hover.
const ENTRANCE_SPRING = { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 } as const;

export default function PhotoWidget({ size }: { size: WidgetSize }) {
  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={ENTRANCE_SPRING}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: `${WIDGET_RADIUS}px`,
        overflow: "hidden",
        boxSizing: "border-box",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.28)",
      }}
    >
      <img
        src="/photos/my_photo.jpeg"
        alt="Shajith"
        decoding="async"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center 10%",
          display: "block",
        }}
      />
    </motion.div>
  );
}
