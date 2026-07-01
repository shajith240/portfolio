"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useShellMetrics } from "@/lib/useShellMetrics";

/* macOS "Photos" widget — a single photo, edge to edge, no text.
   Liquid Glass isn't appropriate here (a photo widget is opaque, not
   translucent, in real macOS) — just a squircle-clipped image with a
   soft shadow. See docs/design-system/materials-glass.md. */

const WIDGET_WIDTH = 260;

export default function PhotoWidget() {
  const metrics = useShellMetrics();
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
        position: "fixed",
        top: `${metrics.inset + 40}px`,
        left: `${metrics.inset}px`,
        zIndex: 20,
        width: `${WIDGET_WIDTH}px`,
        height: `${WIDGET_WIDTH}px`,
        borderRadius: "20px",
        overflow: "hidden",
        boxShadow: hovered
          ? "0 20px 44px rgba(0, 0, 0, 0.45)"
          : "0 16px 36px rgba(0, 0, 0, 0.38)",
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
