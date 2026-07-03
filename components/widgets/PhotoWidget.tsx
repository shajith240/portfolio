"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { WIDGET_RADIUS } from "@/lib/widgetGrid";
import { getSizeDimensions } from "@/lib/widgetSizeTiers";
import type { WidgetSize } from "@/lib/widgetLayoutSchema";

/* macOS "Photos" widget — a single photo, edge to edge, no text.
   Liquid Glass isn't appropriate here (a photo widget is opaque, not
   translucent, in real macOS) — just a squircle-clipped image with a
   soft shadow. See docs/design-system/materials-glass.md.

   All 3 size tiers are the same forced-square shape (155/260/338),
   just more of the photo visible at larger sizes — matches Apple's
   real Photos widget, which crops the same source image tighter or
   looser per size rather than changing layout.

   Shadow is deliberately tight (small blur/offset), not a big diffuse
   glow: real macOS desktop widgets rest close to the surface rather
   than levitating dramatically. */

export default function PhotoWidget({ size }: { size: WidgetSize }) {
  const [hovered, setHovered] = useState(false);
  const dims = getSizeDimensions("photo", size);

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0, 0, 0.58, 1] }}
      whileHover={{ scale: 1.015, y: -2 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        width: `${dims.width}px`,
        height: `${dims.height}px`,
        borderRadius: `${WIDGET_RADIUS}px`,
        overflow: "hidden",
        boxShadow: hovered
          ? "0 6px 18px rgba(0, 0, 0, 0.34)"
          : "0 4px 12px rgba(0, 0, 0, 0.28)",
        transition: "box-shadow 0.22s ease",
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
