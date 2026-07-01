"use client";

import { motion } from "framer-motion";
import { AI_TOOLS } from "@/data/aiTools";

/* macOS "App Shortcuts" / Quick Access-style widget — a compact grid
   of app icons (real macOS widget gallery convention: icon-only, no
   text labels, each icon a squircle-clipped tile), here filled with
   the AI tools actually used most rather than system apps. Clicking
   an icon opens that tool's real site in a new tab, same "external
   link" pattern already used for GitHub/LinkedIn/LeetCode in the
   Dock — not an internal window, since these aren't part of this
   site.

   Grid wraps (flex-wrap) rather than assuming a fixed 2x2/2x4 layout
   — real macOS Quick Access widgets ARE fixed-size, but AI_TOOLS is
   explicitly expected to grow ("I'll add more later"), so a wrapping
   grid absorbs that growth without needing a redesign each time an
   entry is added. */

const WIDGET_WIDTH = 260;
const ENTRANCE_SPRING = { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 } as const;

export default function AIToolsWidget() {
  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={ENTRANCE_SPRING}
      style={{
        width: `${WIDGET_WIDTH}px`,
        padding: "18px",
        borderRadius: "20px",
        background: "var(--glass-regular-bg)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
        WebkitBackdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
        // Tight, close-to-surface shadow — see PhotoWidget.tsx for why
        // (a wide blur bleeds past the stack's 14px inter-widget gap).
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", justifyContent: "center" }}>
        {AI_TOOLS.map((tool) => (
          <button
            key={tool.name}
            onClick={() => window.open(tool.url, "_blank", "noopener,noreferrer")}
            title={tool.name}
            aria-label={tool.name}
            style={{
              width: "52px",
              height: "52px",
              padding: 0,
              border: "none",
              background: "none",
              cursor: "pointer",
              borderRadius: "22%",
              overflow: "hidden",
            }}
          >
            <img
              src={`/icons/${tool.file}.png`}
              alt={tool.name}
              draggable={false}
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            />
          </button>
        ))}
      </div>
    </motion.div>
  );
}
