"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WIDGET_RADIUS } from "@/lib/widgetGrid";
import { motivationImageForNow, MOTIVATION_ROTATION_MS } from "@/data/motivation";
import type { WidgetSize } from "@/lib/widgetLayoutSchema";

/* macOS "Photos" widget — opaque, edge-to-edge, full-bleed cover at
   all three size tiers, any baked-in text stays part of the image.
   No hover reaction: real macOS desktop widgets don't respond to
   hover. Image comes from the auto-discovered rotation
   (public/motivation_quotes — drop a file in, it joins the cycle),
   advancing every 5 minutes with a crossfade. */

// Shared entrance spring (same as NowPlayingWidget/LocationWidget) —
// one motion signature across the widget family.
const ENTRANCE_SPRING = { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 } as const;

export default function MotivationWidget({ size: _size }: { size: WidgetSize }) {
  const [src, setSrc] = useState(() => motivationImageForNow());

  // Re-check on a short cadence — the slot function is deterministic
  // but nothing re-renders this component without a tick. A 30s check
  // lands within half a minute of each 5-minute boundary without a
  // drift-prone long timer.
  useEffect(() => {
    const id = setInterval(() => {
      const next = motivationImageForNow();
      setSrc((prev) => (prev === next ? prev : next));
    }, Math.min(30_000, MOTIVATION_ROTATION_MS));
    return () => clearInterval(id);
  }, []);

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
        position: "relative",
      }}
    >
      {/* keyed crossfade on rotation — old image fades under the new */}
      <AnimatePresence initial={false}>
        <motion.img
          key={src}
          src={src}
          alt="Motivation"
          decoding="async"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
          }}
        />
      </AnimatePresence>
    </motion.div>
  );
}
