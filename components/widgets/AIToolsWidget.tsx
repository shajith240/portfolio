"use client";

import { motion } from "framer-motion";
import { AI_TOOLS } from "@/data/aiTools";
import { WIDGET_PADDING, WIDGET_RADIUS } from "@/lib/widgetGrid";
import { getSizeDimensions } from "@/lib/widgetSizeTiers";
import type { WidgetSize } from "@/lib/widgetLayoutSchema";

/* macOS "App Shortcuts" / Quick Access-style widget. See prior commit
   history for the icon-sizing/Liquid-Glass research this is built on.

   Size tiers (real per-tier icon-count math, not a CSS scale-up):
     - small:  2x2 grid, first 4 tools, 53px icons (computed: 16px
       padding x2 + 2 rows x 53 + 1 gap x16 = 154, ~matches the 155px
       frame with 1px slack absorbed by align-items:center).
     - medium: 3x2 grid, 6 tools, 64px icons (today's layout,
       unchanged).
     - large:  3x3 grid, 9-tool capacity, same 64px icons as medium —
       more capacity for AI_TOOLS to grow into, not bigger tiles
       (260px width is a hard column constraint, so "large" for this
       widget means more rows, matching how real Apple widgets in a
       family usually show more items at Large rather than the same
       items scaled up). */

const ICON_SIZE_BY_TIER: Record<WidgetSize, number> = { small: 53, medium: 64, large: 64 };
const TOOL_COUNT_BY_TIER: Record<WidgetSize, number> = { small: 4, medium: 6, large: 9 };
const ENTRANCE_SPRING = { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 } as const;

export default function AIToolsWidget({ size }: { size: WidgetSize }) {
  const dims = getSizeDimensions("aiTools", size);
  const iconSize = ICON_SIZE_BY_TIER[size];
  const tools = AI_TOOLS.slice(0, TOOL_COUNT_BY_TIER[size]);

  return (
    <motion.div
      className="glass-hero-refraction"
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={ENTRANCE_SPRING}
      style={{
        width: `${dims.width}px`,
        height: `${dims.height}px`,
        padding: `${WIDGET_PADDING}px`,
        borderRadius: `${WIDGET_RADIUS}px`,
        background: "var(--glass-regular-bg)",
        border: "1px solid var(--glass-border)",
        display: "flex",
        alignItems: "center",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "center", width: "100%" }}>
        {tools.map((tool) => (
          <motion.button
            key={tool.name}
            onClick={() => window.open(tool.url, "_blank", "noopener,noreferrer")}
            title={tool.name}
            aria-label={tool.name}
            whileTap={{ scale: 0.9 }}
            style={{
              width: `${iconSize}px`,
              height: `${iconSize}px`,
              padding: 0,
              border: "none",
              background: "none",
              cursor: "pointer",
            }}
          >
            <img
              src={`/icons/${tool.file}.png`}
              alt={tool.name}
              draggable={false}
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
