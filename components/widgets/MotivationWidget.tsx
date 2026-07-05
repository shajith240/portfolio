"use client";

import { motion } from "framer-motion";
import { WIDGET_RADIUS } from "@/lib/widgetGrid";
import { motivationImageForToday } from "@/data/motivation";
import type { WidgetSize } from "@/lib/widgetLayoutSchema";

/* macOS "Photos" widget — opaque, edge-to-edge, full-bleed cover at
   all three size tiers, any baked-in text stays part of the image.
   No hover reaction: real macOS desktop widgets don't respond to
   hover. Image comes from the auto-discovered rotation
   (public/motivation_quotes — drop a file in, it joins the cycle). */

// Shared entrance spring (same as NowPlayingWidget/LocationWidget) —
// one motion signature across the widget family.
const ENTRANCE_SPRING = { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 } as const;

export default function MotivationWidget({ size: _size }: { size: WidgetSize }) {
  const src = motivationImageForToday();
  if (!src) return null; // empty public/motivation_quotes — render nothing

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
        src={src}
        alt="Motivation"
        decoding="async"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
        }}
      />
    </motion.div>
  );
}
