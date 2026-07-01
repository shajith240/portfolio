"use client";

import { useState } from "react";
import { motion } from "framer-motion";

/* macOS "Photos" widget — a single photo, edge to edge, no text.
   Liquid Glass isn't appropriate here (a photo widget is opaque, not
   translucent, in real macOS) — just a squircle-clipped image with a
   soft shadow. See docs/design-system/materials-glass.md.

   Shadow is deliberately tight (small blur/offset), not a big diffuse
   glow: real macOS desktop widgets rest close to the surface rather
   than levitating dramatically. A wide blur radius here would also
   exceed DesktopWidgetStack's 14px inter-widget gap and visibly bleed
   into the next widget, reading as one merged blob instead of two
   distinct floating cards. */

const WIDGET_WIDTH = 260;

export default function PhotoWidget() {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0, 0, 0.58, 1] }}
      whileHover={{ scale: 1.015, y: -2 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        width: `${WIDGET_WIDTH}px`,
        height: `${WIDGET_WIDTH}px`,
        borderRadius: "20px",
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
