"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useShellMetrics } from "@/lib/useShellMetrics";
import { MOTIVATION_IMAGE } from "@/data/motivation";

/* macOS "Photos" widget, right-hand side — same opaque, edge-to-edge
   treatment as PhotoWidget (no Liquid Glass; a photo widget is opaque
   in real macOS, not translucent — see materials-glass.md), same
   260px width as every other widget on this desktop (PhotoWidget,
   AboutWidget, NowPlayingWidget) so it reads as one consistent set,
   not an oversized outlier. Height follows the source image's real
   736x864 aspect ratio exactly (not a square crop) — object-fit:
   contain never needs to letterbox, and nothing is cropped, per an
   explicit no-crop requirement. */

const FRAME_WIDTH = 260;
const FRAME_HEIGHT = Math.round(FRAME_WIDTH * (MOTIVATION_IMAGE.height / MOTIVATION_IMAGE.width));

export default function MotivationWidget() {
  const metrics = useShellMetrics();
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.05, ease: [0, 0, 0.58, 1] }}
      whileHover={{ scale: 1.015, y: -2 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        position: "fixed",
        // Bottom-anchored (like the Dock), not top-anchored like the
        // left widget stack — leaves the entire upper-right area free
        // for other widgets, without needing a pixel offset that'd
        // have to be re-tuned every time something new gets added
        // above this one.
        bottom: `${metrics.inset + 24}px`,
        right: `${metrics.inset}px`,
        zIndex: 20,
        width: `${FRAME_WIDTH}px`,
        height: `${FRAME_HEIGHT}px`,
        borderRadius: "20px",
        overflow: "hidden",
        boxShadow: hovered
          ? "0 20px 44px rgba(0, 0, 0, 0.45)"
          : "0 16px 36px rgba(0, 0, 0, 0.38)",
        transition: "box-shadow 0.22s ease",
      }}
    >
      <img
        src={MOTIVATION_IMAGE.src}
        alt={MOTIVATION_IMAGE.alt}
        decoding="async"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }}
      />
    </motion.div>
  );
}
