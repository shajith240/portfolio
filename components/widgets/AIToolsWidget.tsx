"use client";

import { motion } from "framer-motion";
import { AI_TOOLS } from "@/data/aiTools";
import { WIDGET_RADIUS } from "@/lib/widgetGrid";
import type { WidgetSize } from "@/lib/widgetLayoutSchema";

/* macOS "App Shortcuts" / Quick Access-style widget. See prior commit
   history for the icon-sizing/Liquid-Glass research this is built on.

   Size tiers (real per-tier icon-count and layout math):
     - small:  2x2 grid, first 4 tools, 58px icons, 12px gap, 14px outer padding.
       Available space: 170 - 2×14 = 142px. Layout: 2×58 + 12 = 128px in 142 = 7px even margin.
     - medium: 3-col grid (landscape 354×170), 6 tools, 66px icons, 10px gap, 14px outer padding.
       Available space: 354 - 2×14 = 326px. Layout: 3×66 + 2×10 = 218px in 326 = 54px per side.
     - large:  3x3 grid, 9-tool capacity, 66px icons, 10px gap, 14px outer padding.
       Available space: 354×354. Same horizontal as medium, full square vertically. */

const ICON_SIZE_BY_TIER: Record<WidgetSize, number> = { small: 58, medium: 66, large: 66 };
const TOOL_COUNT_BY_TIER: Record<WidgetSize, number> = { small: 4, medium: 6, large: 9 };
const COLS_BY_TIER: Record<WidgetSize, number> = { small: 2, medium: 3, large: 3 };
const GRID_GAP = 10; // Equal h/v spacing between icons; 12 for small (tighter fit), 10 for medium/large
const ENTRANCE_SPRING = { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 } as const;

export default function AIToolsWidget({ size }: { size: WidgetSize }) {
  const iconSize = ICON_SIZE_BY_TIER[size];
  const cols = COLS_BY_TIER[size];
  const tools = AI_TOOLS.slice(0, TOOL_COUNT_BY_TIER[size]);
  const gap = size === "small" ? 12 : GRID_GAP;

  return (
    <motion.div
      className="glass-hero-refraction"
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={ENTRANCE_SPRING}
      style={{
        width: "100%",
        height: "100%",
        padding: "14px",
        borderRadius: `${WIDGET_RADIUS}px`,
        background: "var(--glass-regular-bg)",
        border: "1px solid var(--glass-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${iconSize}px)`,
          gap: `${gap}px`,
          justifyContent: "center",
        }}
      >
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
