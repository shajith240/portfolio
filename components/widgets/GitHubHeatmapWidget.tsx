"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { WIDGET_RADIUS } from "@/lib/widgetGrid";
import type { WidgetSize } from "@/lib/widgetLayoutSchema";

interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface GitHubResponse {
  contributions: ContributionDay[];
}

// Cache contributions client-side to prevent refetch on re-mount
let cachedContributions: ContributionDay[] | null = null;
let cachePromise: Promise<ContributionDay[]> | null = null;

// GitHub's dark-mode contribution palette
const LEVEL_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "#161b22",
  1: "#0e4429",
  2: "#006d32",
  3: "#26a641",
  4: "#39d353",
};

// Shared entrance spring (same as MotivationWidget/AIToolsWidget)
const ENTRANCE_SPRING = {
  type: "spring",
  stiffness: 520,
  damping: 44,
  mass: 0.85,
  restDelta: 0.01,
} as const;

// Calculate how many weeks fit in the available width
// Cell: 10px, gap: 3px, stride: 13px = (innerWidth + 3) / 13
function weeksToShow(width: number): number {
  return Math.floor((width + 3) / 13);
}

// Fetch contributions for shajith240
async function fetchContributions(): Promise<ContributionDay[]> {
  if (cachedContributions) return cachedContributions;

  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    try {
      const res = await fetch(
        "https://github-contributions-api.jogruber.de/v4/shajith240?y=last"
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: GitHubResponse = await res.json();
      cachedContributions = data.contributions;
      return cachedContributions;
    } catch {
      // On error, return empty array so grid still renders in level0
      return [];
    }
  })();

  return cachePromise;
}

export default function GitHubHeatmapWidget({ size }: { size: WidgetSize }) {
  const [contributions, setContributions] = useState<ContributionDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await fetchContributions();
      setContributions(data);
      setIsLoading(false);
    })();
  }, []);

  // Grid dimensions: cells 10px, gaps 3px (13px stride), rows are Sun-Sat (7 columns)
  const CELL_SIZE = 10;
  const CELL_GAP = 3;
  const CELL_STRIDE = CELL_SIZE + CELL_GAP; // 13

  // Calculate available inner width based on tier
  // small: 170, medium: 354, large: 354
  // Subtract padding to get usable area
  const innerWidth =
    size === "small" ? 170 - 2 * 14 : size === "medium" ? 354 - 2 * 14 : 354 - 2 * 14;

  const weeks = weeksToShow(innerWidth);
  const gridWidth = weeks * CELL_STRIDE - CELL_GAP; // Last stride doesn't have trailing gap

  // Get most recent `weeks` number of contributions, sorted chronologically
  // (API returns recent first, so reverse to get oldest-to-newest within our window)
  const recentContributions = contributions
    .slice(0, weeks * 7) // Max cells we could render (7 rows × weeks)
    .reverse(); // Chronological order (oldest first)

  // Build a week-by-week grid: each week is a column of 7 days (Sun-Sat)
  const weekChunks: ContributionDay[][] = [];
  for (let i = 0; i < recentContributions.length; i += 7) {
    weekChunks.push(recentContributions.slice(i, i + 7));
  }

  // Pad weeks with empty days (level 0) if needed to fill the expected grid
  while (weekChunks.length < weeks) {
    weekChunks.push(Array(7).fill(null).map(() => ({ date: "", count: 0, level: 0 as const })));
  }

  // Center grid vertically for large (354×354 with 88px tall grid)
  const innerHeight = size === "large" ? 354 - 2 * 14 : 170 - 2 * 14;
  const gridHeight = 7 * CELL_STRIDE - CELL_GAP;
  const verticalPadding =
    size === "large" ? Math.max(0, (innerHeight - gridHeight) / 2) : 0;

  // Center grid horizontally
  const horizontalPadding = Math.max(0, (innerWidth - gridWidth) / 2);

  return (
    <motion.div
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
      <svg
        viewBox={`0 0 ${gridWidth} ${gridHeight}`}
        width={gridWidth}
        height={gridHeight}
        style={{
          display: "block",
          marginLeft: `${horizontalPadding}px`,
          marginTop: `${verticalPadding}px`,
          marginBottom: `${verticalPadding}px`,
        }}
      >
        {weekChunks.map((week, weekIdx) =>
          week.map((day, dayIdx) => {
            const x = weekIdx * CELL_STRIDE;
            const y = dayIdx * CELL_STRIDE;
            const level = day.level;
            const color = LEVEL_COLORS[level];

            return (
              <rect
                key={`${weekIdx}-${dayIdx}`}
                x={x}
                y={y}
                width={CELL_SIZE}
                height={CELL_SIZE}
                fill={color}
                rx={2}
                style={{
                  outline: "1px solid rgba(255, 255, 255, 0.04)",
                  outlineOffset: "-1px",
                }}
              />
            );
          })
        )}
      </svg>
    </motion.div>
  );
}
