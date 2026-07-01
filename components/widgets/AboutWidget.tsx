"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useShellMetrics } from "@/lib/useShellMetrics";
import { useWindowManager } from "@/contexts/WindowManagerContext";

/* macOS-style info widget — sits directly below PhotoWidget (same
   width, small gap). Liquid Glass material + widget-scale radius, per
   docs/design-system/materials-glass.md. Typography follows
   docs/design-system/typography.md: Semibold (not Bold) for the
   headline-weight tagline, an uppercase Semibold label for the
   section header (matching InfoCard's label treatment elsewhere in
   the app), Regular for body copy. */

const WIDGET_WIDTH = 260;
const PHOTO_WIDGET_HEIGHT = 260;
const WIDGET_GAP = 14;

export default function AboutWidget() {
  const metrics = useShellMetrics();
  const { openWindow } = useWindowManager();
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.05, ease: [0, 0, 0.58, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "fixed",
        top: `${metrics.inset + 40 + PHOTO_WIDGET_HEIGHT + WIDGET_GAP}px`,
        left: `${metrics.inset}px`,
        zIndex: 20,
        width: `${WIDGET_WIDTH}px`,
        padding: "16px",
        borderRadius: "20px",
        background: "var(--glass-regular-bg)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
        WebkitBackdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
        boxShadow: "0 16px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
      }}
    >
      <p
        style={{
          margin: "0 0 12px 0",
          fontSize: "16px",
          fontWeight: 600,
          lineHeight: 1.3,
          letterSpacing: "-0.01em",
          color: "var(--text-primary)",
        }}
      >
        Hey, I&apos;m Shajith. I build things people want to use.
      </p>

      <span
        style={{
          display: "block",
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "var(--text-ghost)",
          marginBottom: "4px",
        }}
      >
        About me
      </span>
      <p
        style={{
          margin: "0 0 12px 0",
          fontSize: "12.5px",
          lineHeight: 1.45,
          color: "var(--text-muted)",
        }}
      >
        CS student at IIT(ISM) Dhanbad. I learn by building.
      </p>

      <button
        onClick={() => openWindow("/about", "About")}
        style={{
          fontSize: "12px",
          fontWeight: 500,
          color: hovered ? "#FF4500" : "var(--text-ghost)",
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          transition: "color 0.15s ease",
        }}
      >
        Read more →
      </button>
    </motion.div>
  );
}
