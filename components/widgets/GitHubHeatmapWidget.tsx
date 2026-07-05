"use client";

import { useEffect, useRef, useState } from "react";
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

interface MonthLabel {
  weekIndex: number;
  label: string;
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

// Weeks are derived from the MEASURED inner width of the card, not
// from assumed tier pixel sizes — WidgetFrame owns the real size and
// hardcoding 170/354 here left the grid overflowing or off-center
// whenever the frame's actual box differed. Cells stay exactly 10px;
// only the number of visible weeks adapts.

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

// Compute month labels for the grid using GitHub's collision rules
// Label appears above the first week-column of a new month
// Skip if within 2 columns of previous label or if it's the first column and next label would crowd it
function computeMonthLabels(
  weekChunks: ContributionDay[][],
): MonthLabel[] {
  if (weekChunks.length === 0) return [];

  const labels: MonthLabel[] = [];
  let lastLabelWeek = -Infinity;

  for (let weekIdx = 0; weekIdx < weekChunks.length; weekIdx++) {
    const week = weekChunks[weekIdx];
    if (week.length === 0) continue;

    // Get the first day with a valid date in this week
    const firstDayWithDate = week.find((day) => day.date);
    if (!firstDayWithDate) continue;

    const currentMonth = new Date(firstDayWithDate.date).getMonth();

    // Check if this week's month differs from previous week's month
    const prevWeek = weekIdx > 0 ? weekChunks[weekIdx - 1] : null;
    let prevMonth = -1;
    if (prevWeek) {
      const prevDayWithDate = prevWeek.find((day) => day.date);
      if (prevDayWithDate) {
        prevMonth = new Date(prevDayWithDate.date).getMonth();
      }
    }

    // Only add label if month changed (or it's the first week with a valid date)
    if (currentMonth !== prevMonth) {
      // Apply GitHub's collision rule: skip if within 2 columns of last label
      // or if this is column 0 and next label would be too close
      const tooClose = weekIdx - lastLabelWeek <= 2;
      if (!tooClose) {
        const monthLabel = new Intl.DateTimeFormat("en-US", {
          month: "short",
        }).format(new Date(firstDayWithDate.date));
        labels.push({ weekIndex: weekIdx, label: monthLabel });
        lastLabelWeek = weekIdx;
      }
    }
  }

  return labels;
}

export default function GitHubHeatmapWidget({ size }: { size: WidgetSize }) {
  const [contributions, setContributions] = useState<ContributionDay[]>([]);
  const [inner, setInner] = useState<{ width: number; height: number } | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const data = await fetchContributions();
      setContributions(data);
    })();
  }, []);

  // Measure the card's real content box (and re-measure when the
  // frame resizes between tiers).
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () =>
      setInner({ width: host.clientWidth, height: host.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  // Grid dimensions: cells 10px, gaps 3px (13px stride), rows are Sun-Sat (7 columns)
  const CELL_SIZE = 10;
  const CELL_GAP = 3;
  const CELL_STRIDE = CELL_SIZE + CELL_GAP; // 13

  // How many whole week-columns fit the measured width.
  const targetWeek = inner
    ? Math.max(4, Math.floor((inner.width + CELL_GAP) / CELL_STRIDE))
    : 0;

  // The API returns days in CHRONOLOGICAL order (oldest → newest).
  // Build Sunday-aligned week columns exactly like GitHub does — a
  // column is Sun..Sat, the last (current) week is padded with empty
  // trailing cells — then keep the most recent N columns. The first
  // version assumed newest-first data and sliced from the front,
  // which showed last year's oldest months in reverse (Nov → Jul).
  const emptyDay = (): ContributionDay => ({ date: "", count: 0, level: 0 as const });
  const allWeeks: ContributionDay[][] = [];
  let currentWeek: ContributionDay[] = [];
  for (const day of contributions) {
    // "YYYY-MM-DD" parses as UTC midnight; getUTCDay gives the
    // calendar weekday without local-timezone drift.
    const dow = new Date(day.date).getUTCDay();
    if (dow === 0 && currentWeek.length > 0) {
      allWeeks.push(currentWeek);
      currentWeek = [];
    }
    if (currentWeek.length === 0 && allWeeks.length === 0 && dow !== 0) {
      // Very first week may start mid-week — pad its leading days.
      currentWeek = Array.from({ length: dow }, emptyDay);
    }
    currentWeek.push(day);
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(emptyDay());
    allWeeks.push(currentWeek);
  }
  let weekChunks = allWeeks.slice(-targetWeek);

  // Pad (prepend) empty weeks if there isn't enough data yet, so the
  // grid is always full and the newest week stays on the RIGHT.
  while (weekChunks.length < targetWeek) {
    weekChunks = [Array.from({ length: 7 }, emptyDay), ...weekChunks];
  }

  // Compute month labels (GitHub-style collision detection)
  const monthLabels = computeMonthLabels(weekChunks);

  // Grid dimensions based on exact target weeks
  const gridWidth = Math.max(0, targetWeek * CELL_STRIDE - CELL_GAP); // Last stride doesn't have trailing gap
  const gridHeight = 7 * CELL_STRIDE - CELL_GAP;

  // Label row dimensions
  const LABEL_HEIGHT = 13;
  const LABEL_GAP = 4;

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
        boxSizing: "border-box",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Measured host: fills the padded content box; the grid unit
          is flex-centered inside it, no margin arithmetic. */}
      <div
        ref={hostRef}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {targetWeek > 0 && (
        <div style={{ position: "relative", width: gridWidth }}>
        {/* Month labels row (absolutely positioned above grid) */}
        <div
          style={{
            position: "relative",
            height: LABEL_HEIGHT,
            marginBottom: `${LABEL_GAP}px`,
          }}
        >
          {monthLabels.map(({ weekIndex, label }) => (
            <span
              key={`label-${weekIndex}`}
              style={{
                position: "absolute",
                left: `${weekIndex * CELL_STRIDE}px`,
                top: 0,
                fontSize: "9px",
                fontWeight: 400,
                color: "#7d8590",
                lineHeight: `${LABEL_HEIGHT}px`,
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Contribution grid */}
        <svg
          viewBox={`0 0 ${gridWidth} ${gridHeight}`}
          width={gridWidth}
          height={gridHeight}
          style={{
            display: "block",
          }}
        >
          {weekChunks.map((week, weekIdx) =>
            week.map((day, dayIdx) => {
              const x = weekIdx * CELL_STRIDE;
              const y = dayIdx * CELL_STRIDE;
              const level = day.level;
              const color = LEVEL_COLORS[level];

              return (
                // stroke, not CSS outline — outline is not a valid
                // SVG presentation property; GitHub's own cells use a
                // hairline stroke for the keyline.
                <rect
                  key={`${weekIdx}-${dayIdx}`}
                  x={x + 0.5}
                  y={y + 0.5}
                  width={CELL_SIZE - 1}
                  height={CELL_SIZE - 1}
                  fill={color}
                  rx={2}
                  stroke="rgba(255, 255, 255, 0.04)"
                  strokeWidth={1}
                />
              );
            })
          )}
        </svg>
        </div>
        )}
      </div>
    </motion.div>
  );
}
