"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useShellMetrics } from "@/lib/useShellMetrics";

/* macOS desktop widget — replaces the old LeftSidebar profile card.
   Floats directly on the wallpaper, home route only (see AppShell).
   Liquid Glass material + widget-scale corner radius (~20px, larger
   than the old 10-16px card radius) per docs/design-system/materials-glass.md. */

export default function ProfileWidget() {
  const metrics = useShellMetrics();
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0, 0, 0.58, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "fixed",
        top: `${metrics.inset + 40}px`,
        left: `${metrics.inset}px`,
        zIndex: 20,
        width: "260px",
        padding: "18px",
        borderRadius: "20px",
        background: "var(--glass-regular-bg)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
        WebkitBackdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
        boxShadow: "0 16px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        color: "var(--text-primary)",
      }}
    >
      <p style={{ margin: "0 0 14px 0", fontSize: "17px", fontWeight: 700, lineHeight: 1.3, letterSpacing: "-0.01em" }}>
        Hey, I&apos;m Shajith.
        <br />
        I build things people want to use.
      </p>

      <img
        src="/photos/my_photo.jpeg"
        alt="Shajith"
        decoding="async"
        style={{
          width: "100%",
          height: "200px",
          objectFit: "cover",
          objectPosition: "center 10%",
          borderRadius: "14px",
          display: "block",
        }}
      />

      <p style={{ fontSize: "13px", fontWeight: 700, color: hovered ? "#FF4500" : "var(--text-primary)", margin: "12px 0 3px 0", transition: "color 0.15s ease" }}>
        About me
      </p>
      <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.4, margin: "0 0 10px 0" }}>
        CS student at IIT(ISM) Dhanbad. I learn by building.
      </p>

      <a
        href="/about"
        style={{
          fontSize: "12px",
          color: hovered ? "#FF4500" : "var(--text-ghost)",
          textDecoration: "none",
          transition: "color 0.15s ease",
        }}
      >
        Read more →
      </a>
    </motion.div>
  );
}
