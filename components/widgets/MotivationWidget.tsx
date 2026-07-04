"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { getSizeDimensions } from "@/lib/widgetSizeTiers";
import { MOTIVATION_IMAGE } from "@/data/motivation";

/* macOS "Photos" widget, right-hand side — same opaque, edge-to-edge
   treatment as PhotoWidget. No "small" tier — a 155px crop would
   likely make the quote baked into the image pixels illegible; only
   medium (today's tuned 210px) and large exist for this widget. */

export default function MotivationWidget({ size }: { size: "medium" | "large" }) {
  const [hovered, setHovered] = useState(false);
  const dims = getSizeDimensions("motivation", size);

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.05, ease: [0, 0, 0.58, 1] }}
      whileHover={{ scale: 1.015, y: -2 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        width: `${dims.width}px`,
        height: `${dims.height}px`,
        borderRadius: "20px",
        overflow: "hidden",
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
