"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useShellMetrics } from "@/lib/useShellMetrics";
import { MOTIVATION_IMAGE } from "@/data/motivation";

/* macOS "Photos" widget, right-hand side — same opaque, edge-to-edge
   treatment as PhotoWidget (no Liquid Glass; a photo widget is opaque
   in real macOS, not translucent — see materials-glass.md), sized to
   Apple's largest real widget tier instead of the small one
   PhotoWidget uses, and to the source image's own aspect ratio rather
   than a square crop.

   Real WidgetKit family sizes (widely documented, e.g.
   developer.apple.com/documentation/widgetkit/supporting-additional-widget-sizes):
   systemSmall 169x169pt, systemMedium 360x169pt, systemLarge
   360x376pt. PhotoWidget already scales systemSmall's 169pt width up
   to this site's 260px column convention (a ~1.54x scale). Applying
   that same scale factor to systemLarge's width gives this widget's
   frame width; height then follows the real image's own 736x864
   aspect ratio exactly (not systemLarge's near-square ratio) — so
   object-fit: contain never needs to letterbox, and nothing is
   cropped, per an explicit no-crop requirement. */

const SYSTEM_SMALL_WIDTH_PT = 169;
const SYSTEM_LARGE_WIDTH_PT = 360;
const PHOTO_WIDGET_SCALE = 260 / SYSTEM_SMALL_WIDTH_PT;

const FRAME_WIDTH = Math.round(SYSTEM_LARGE_WIDTH_PT * PHOTO_WIDGET_SCALE);
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
        top: `${metrics.inset + 40}px`,
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
