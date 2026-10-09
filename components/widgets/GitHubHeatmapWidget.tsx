"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { WIDGET_RADIUS } from "@/lib/widgetGrid";
import { useLiquidGlass } from "@/lib/liquidGlass";
import type { WidgetSize } from "@/lib/widgetLayoutSchema";
import WidgetViewToggle, { GitHubMark, GridGlyph, PinGlyph } from "@/components/widgets/WidgetViewToggle";

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

// GitHub's dark-mode greens, but a NEUTRAL translucent empty cell:
// #161b22 was designed for GitHub's solid #0d1117 page — on our
// wallpaper-tinted glass it reads as alien navy boxes. A white wash
// lets the glass material show through, so empty cells belong to
// the widget the way Apple widgets treat their inactive elements.
const LEVEL_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "rgba(255, 255, 255, 0.09)",
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

/* ── Pinned repositories ─────────────────────────────────────────── */

interface PinnedRepo {
  name: string;
  description: string | null;
  url: string;
  stars: number;
  language: string | null;
  languageColor: string | null;
  forkedFrom: string | null;
}

let cachedPinned: PinnedRepo[] | null = null;
let pinnedPromise: Promise<PinnedRepo[] | null> | null = null;

function fetchPinned(): Promise<PinnedRepo[] | null> {
  if (cachedPinned) return Promise.resolve(cachedPinned);
  if (!pinnedPromise) {
    pinnedPromise = fetch("/api/github/pinned")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || d.error || !Array.isArray(d.repos)) return null;
        cachedPinned = d.repos as PinnedRepo[];
        return cachedPinned;
      })
      .catch(() => null)
      .finally(() => {
        if (!cachedPinned) pinnedPromise = null;
      });
  }
  return pinnedPromise;
}

// GitHub's linguist colours for the languages in play; the route
// usually supplies the colour itself (GraphQL / profile HTML), this
// covers the REST fallback.
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  Python: "#3572A5",
  JavaScript: "#f1e05a",
  HTML: "#e34c26",
  CSS: "#663399",
  Java: "#b07219",
  C: "#555555",
  "C++": "#f34b7d",
};
const NEUTRAL_LANGUAGE = "#8b949e";

// GitHub dark mode's link blue — reads clearly on the dark glass and
// says "this opens" the way GitHub's own pinned cards do.
const REPO_LINK = "#4493f8";

function RepoCard({ repo, roomy }: { repo: PinnedRepo; roomy: boolean }) {
  const downAt = useRef<{ x: number; y: number } | null>(null);
  const muted = "rgba(255, 255, 255, 0.6)";
  const color = repo.languageColor || (repo.language && LANGUAGE_COLORS[repo.language]) || NEUTRAL_LANGUAGE;
  return (
    <a
      href={repo.url}
      target="_blank"
      rel="noopener noreferrer"
      draggable={false}
      onPointerDown={(e) => (downAt.current = { x: e.clientX, y: e.clientY })}
      onClick={(e) => {
        // A drag (edit mode) that ends on a card isn't a click.
        const d = downAt.current;
        if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) e.preventDefault();
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 4,
        minWidth: 0,
        minHeight: 0,
        padding: "7px 9px",
        boxSizing: "border-box",
        // GitHub's pinned card (dark mode), adapted to glass like the
        // heatmap's cells: a light wash + hairline keyline instead of
        // GitHub's solid #0d1117 box and #3d444d border. Radius 8 =
        // the widget's 22 minus its 14 padding (concentric).
        borderRadius: 8,
        background: "rgba(255, 255, 255, 0.05)",
        boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.12)",
        textDecoration: "none",
        overflow: "hidden",
      }}
    >
      <div style={{ minWidth: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
          {/* Octicon repo-16 */}
          <svg width="11" height="11" viewBox="0 0 16 16" aria-hidden style={{ flex: "none" }}>
            <path
              fill="rgba(255, 255, 255, 0.5)"
              d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"
            />
          </svg>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: REPO_LINK,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {repo.name}
          </span>
        </div>
        {roomy && (repo.description || repo.forkedFrom) && (
          <div
            style={{
              marginTop: 4,
              fontSize: 10.5,
              lineHeight: "14px",
              color: repo.description ? muted : "rgba(255, 255, 255, 0.45)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {repo.description ?? `Forked from ${repo.forkedFrom}`}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 10.5, color: muted, whiteSpace: "nowrap" }}>
        {repo.language && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, minWidth: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flex: "none" }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{repo.language}</span>
          </span>
        )}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }} aria-label={`${repo.stars} stars`}>
          {/* Octicon star-16 */}
          <svg width="10" height="10" viewBox="0 0 16 16" aria-hidden>
            <path
              fill="currentColor"
              d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z"
            />
          </svg>
          {repo.stars}
        </span>
      </div>
    </a>
  );
}

// Pinned cards in a 2-column grid (1 column when narrow) filling the
// given box. Rows share the height, capped so a short list doesn't
// stretch into slabs.
function PinnedGrid({ repos, width, height, max }: {
  repos: PinnedRepo[] | null;
  width: number;
  height: number;
  max: number;
}) {
  const GAP = 8;
  const cols = width >= 240 ? 2 : 1;
  if (repos && repos.length === 0) {
    return (
      <div style={{ height, display: "grid", placeItems: "center", fontSize: 11, color: "rgba(255, 255, 255, 0.45)" }}>
        No pinned repositories
      </div>
    );
  }
  const capacityRows = Math.max(1, Math.floor((height + GAP) / (44 + GAP)));
  const shown = (repos ?? []).slice(0, Math.min(max, capacityRows * cols));
  const rows = repos ? Math.max(1, Math.ceil(shown.length / cols)) : Math.min(2, capacityRows);
  const rowH = Math.min(96, (height - GAP * (rows - 1)) / rows);
  return (
    <div
      style={{
        width,
        height,
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridAutoRows: rowH,
        gap: GAP,
        alignContent: "start",
      }}
    >
      {repos
        ? shown.map((r) => <RepoCard key={r.url} repo={r} roomy={rowH >= 64} />)
        : // Loading: quiet placeholder cards in the same grid.
          Array.from({ length: rows * cols }, (_, i) => (
            <div key={i} style={{ borderRadius: 8, background: "rgba(255, 255, 255, 0.05)" }} />
          ))}
    </div>
  );
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
      // Column 0 gets a label only if the month actually STARTS in
      // that first visible week — labeling a mid-month partial
      // ("Jan" over three leftover January days) is what GitHub
      // avoids and what looked wrong in the widget.
      if (weekIdx === 0 && new Date(firstDayWithDate.date).getUTCDate() > 7) continue;
      // Skip labels in the last two columns — they'd clip at the
      // grid's right edge (the "Ju" artifact).
      if (weekIdx > weekChunks.length - 3) continue;
      // GitHub's collision rule: skip if within 2 columns of last label
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

type View = "contributions" | "pinned";

export default function GitHubHeatmapWidget({ size }: { size: WidgetSize }) {
  const [contributions, setContributions] = useState<ContributionDay[]>([]);
  const [pinned, setPinned] = useState<PinnedRepo[] | null>(cachedPinned);
  const [view, setView] = useState<View>("contributions");
  const reduceMotion = useReducedMotion();
  const stacked = size === "large";
  const [inner, setInner] = useState<{ width: number; height: number } | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  // Card material: refraction engine + .liquid-glass rim class.
  const lgRef = useLiquidGlass<HTMLDivElement>({ radius: WIDGET_RADIUS, bezel: 14, strength: 0.6, blur: 5, brightness: 0.88, tint: 0.18 });

  useEffect(() => {
    (async () => {
      const data = await fetchContributions();
      setContributions(data);
    })();
    let alive = true;
    fetchPinned().then((d) => {
      // A failed fetch shows the empty state rather than a forever
      // skeleton.
      if (alive) setPinned(d ?? []);
    });
    return () => {
      alive = false;
    };
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

  // View switch: a short crossfade with a subtle slide, each view on
  // its own side (contributions left, pinned right). Reduced motion:
  // opacity only.
  const swap = (side: -1 | 1) =>
    reduceMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
      : {
          initial: { opacity: 0, x: 10 * side },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: 10 * side },
          transition: { duration: 0.22, ease: [0, 0, 0.58, 1] as const },
        };

  return (
    <motion.div
      ref={lgRef}
      className="liquid-glass"
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={ENTRANCE_SPRING}
      style={{
        width: "100%",
        height: "100%",
        padding: "14px",
        borderRadius: `${WIDGET_RADIUS}px`,
        boxSizing: "border-box",
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
          // Large stacks heatmap + pinned from the top; the other tiers
          // keep the heatmap unit centred exactly as before.
          alignItems: stacked ? "flex-start" : "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {targetWeek > 0 && (
        <div style={{ position: "relative", width: gridWidth }}>
        {/* Identity row — octocat mark + "GitHub" so the graph reads
            as a GitHub streak at a glance. Quiet, label-weight. */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "8px", position: "relative" }}>
          <GitHubMark />
          <span style={{ fontSize: "10px", fontWeight: 600, color: "rgba(255, 255, 255, 0.55)", letterSpacing: "0.01em" }}>
            GitHub
          </span>
          {/* Toggle shares the header line, absolutely placed so the
              row (and the grid under it) lays out exactly as before. */}
          {!stacked && (
            <WidgetViewToggle
              value={view}
              onChange={setView}
              options={[
                { id: "contributions", label: "Contributions", icon: <GridGlyph /> },
                { id: "pinned", label: "Pinned repositories", icon: <PinGlyph /> },
              ]}
              style={{ top: -4, right: 0 }}
            />
          )}
        </div>
        {/* Both views live in one box exactly as tall as the labels row
            + grid, so switching never moves the header or the card. */}
        <div style={{ position: "relative", height: LABEL_HEIGHT + LABEL_GAP + gridHeight }}>
        <AnimatePresence initial={false}>
        {(stacked || view === "contributions") ? (
        <motion.div key="contributions" {...swap(-1)} style={{ position: "absolute", inset: 0 }}>
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
                fontSize: "10px",
                fontWeight: 500,
                color: "rgba(255, 255, 255, 0.45)",
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
              // Padding cells (date === "") are alignment slots, not
              // days: the leading pad before the first data day and —
              // the one that looked wrong — the trailing pad after
              // TODAY in the current week. GitHub renders blank space
              // there, never cells; days that don't exist yet get no
              // box.
              if (!day.date) return null;

              const x = weekIdx * CELL_STRIDE;
              const y = dayIdx * CELL_STRIDE;
              const level = day.level;
              const color = LEVEL_COLORS[level];

              return (
                // No keyline stroke: GitHub's hairline exists to
                // separate solid cells from its solid page; on
                // translucent cells over glass it just reads dirty.
                <rect
                  key={`${weekIdx}-${dayIdx}`}
                  x={x}
                  y={y}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  fill={color}
                  rx={2}
                />
              );
            })
          )}
        </svg>
        </motion.div>
        ) : (
        <motion.div key="pinned" {...swap(1)} style={{ position: "absolute", inset: 0 }}>
          <PinnedGrid repos={pinned} width={gridWidth} height={LABEL_HEIGHT + LABEL_GAP + gridHeight} max={4} />
        </motion.div>
        )}
        </AnimatePresence>
        </div>
        {stacked && inner && (
          <div style={{ marginTop: 14 }}>
            <PinnedGrid
              repos={pinned}
              width={gridWidth}
              height={Math.max(0, inner.height - (12 + 8) - (LABEL_HEIGHT + LABEL_GAP + gridHeight) - 14)}
              max={6}
            />
          </div>
        )}
        </div>
        )}
      </div>
    </motion.div>
  );
}
