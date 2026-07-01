"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useShellMetrics } from "@/lib/useShellMetrics";
import { BOTTOM_RESERVE } from "@/contexts/WindowManagerContext";
import { MOTIVATION_IMAGE } from "@/data/motivation";

/* macOS "Photos" widget, right-hand side — same opaque, edge-to-edge
   treatment as PhotoWidget (no Liquid Glass; a photo widget is opaque
   in real macOS, not translucent — see materials-glass.md).

   Deliberately NOT the same 260px width as the left-hand widgets:
   PhotoWidget/AboutWidget/NowPlayingWidget already scale up Apple's
   real systemSmall widget (169pt) by ~1.54x for visual weight on a
   text-heavy left column, and a dense, high-detail photo reads as
   much "louder" than a text card at the same physical size.

   169px (systemSmall's literal, un-scaled width) was tried and was
   too small — this specific image has a quote baked into the artwork
   itself, and at 169px wide the text became illegible. 210px is the
   balance point: still visibly smaller/quieter than the other
   widgets' 260px, but wide enough to keep the baked-in quote
   readable. Height still follows the source image's real 736x864
   aspect ratio exactly (not a square crop) — object-fit: contain
   never needs to letterbox, and nothing is cropped, per an explicit
   no-crop requirement. */

const FRAME_WIDTH = 210;
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
        // above this one. Real macOS reserves dedicated space above
        // the Dock so nothing overlaps it; BOTTOM_RESERVE is this
        // codebase's already-established value for that (the same
        // clearance windows are kept above in WindowManagerContext),
        // not a fresh guess.
        bottom: `${BOTTOM_RESERVE}px`,
        right: `${metrics.inset}px`,
        zIndex: 20,
        width: `${FRAME_WIDTH}px`,
        height: `${FRAME_HEIGHT}px`,
        borderRadius: "20px",
        overflow: "hidden",
        // Tight, close-to-surface shadow — see PhotoWidget.tsx for why
        // (a wide blur bleeds past the 14px inter-widget gap).
        boxShadow: hovered
          ? "0 6px 18px rgba(0, 0, 0, 0.34)"
          : "0 4px 12px rgba(0, 0, 0, 0.28)",
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
