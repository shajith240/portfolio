"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/* Submission heatmap shared by the LeetCode and Codeforces widgets.

   Two variants, because the two sites draw their calendars differently:

   - "leetcode": a reproduction of LeetCode's own profile heatmap
     (measured on leetcode.com/u/shajith240, dark mode). Every calendar
     month is its own block of Sunday-first week columns; a week that
     straddles two months appears in BOTH blocks with the other month's
     days left empty, which is what opens the gaps between months. Three
     green levels, LeetCode's popover tooltip, 14px month labels BELOW
     the grid, drawn 1:1 in SVG user units.
   - "github": the GitHub widget's grid (10px cells, 3px gap, month
     labels above, the same four greens and neutral glass-wash empty
     cell) for sources that have no calendar look of their own.

   Both self-measure like GitHubHeatmapWidget: they fill their parent
   and show as many recent weeks / whole months as fit at the true
   cell size, newest on the right. */

export interface ActivityDay {
  date: string; // "YYYY-MM-DD", UTC calendar day
  count: number;
}

export interface ActivityRange {
  total: number; // submissions inside the visible range
  activeDays: number;
  maxStreak: number;
  months: number; // calendar months the visible range touches
}

interface ActivityHeatmapProps {
  days: ActivityDay[];
  variant: "leetcode" | "github";
  // Rendered above the grid; receives stats for the range that fit.
  header?: (range: ActivityRange) => ReactNode;
  // Reports the visible range's stats (e.g. for a header outside).
  onRange?: (range: ActivityRange) => void;
}

// Calls onRange whenever the visible range's stats change.
function useReportRange(range: ActivityRange, onRange?: (r: ActivityRange) => void) {
  const { total, activeDays, maxStreak, months } = range;
  useEffect(() => {
    onRange?.({ total, activeDays, maxStreak, months });
  }, [total, activeDays, maxStreak, months, onRange]);
}

const DAY_MS = 86_400_000;
const dayIndexOf = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
const todayIndex = () => Math.floor(Date.now() / DAY_MS);
const dateOfIndex = (i: number) => new Date(i * DAY_MS);

function rangeStats(counts: Map<number, number>, from: number, to: number, months: number): ActivityRange {
  let total = 0;
  let activeDays = 0;
  let run = 0;
  let maxStreak = 0;
  for (let i = from; i <= to; i++) {
    const c = counts.get(i) ?? 0;
    total += c;
    if (c > 0) {
      activeDays++;
      run++;
      if (run > maxStreak) maxStreak = run;
    } else {
      run = 0;
    }
  }
  return { total, activeDays, maxStreak, months };
}

/* ── LeetCode variant ─────────────────────────────────────────────── */

// Measured geometry (SVG user units = px at 1:1).
const LC_CELL = 8.86;
const LC_STEP = 11.52; // 2.66 gap
const LC_MONTH_GAP = 4.43; // next.x = prev.x + weeks × 11.52 + 4.43
const LC_GRID_H = 6 * LC_STEP + LC_CELL; // 77.98
const LC_LABEL_Y = 97.14;
const LC_VIEW_H = 104.64;
const LC_EMPTY = "rgba(255, 255, 255, 0.08)";
const LC_LEVELS = ["rgb(1, 102, 32)", "rgb(40, 194, 68)", "rgb(127, 225, 139)"] as const;

// LeetCode doesn't publish its thresholds. Relative cut-offs of the
// user's own busiest day: ≥15% of max → level 2, ≥30% → level 3. On
// Shajith's real calendar (max 13) that's 1 / 2–3 / ≥4, which
// reproduces the exact 95 / 50 / 25 split LeetCode itself draws.
function lcLevel(count: number, max: number) {
  if (count >= Math.max(3, Math.ceil(max * 0.3))) return 2;
  if (count >= Math.max(2, Math.ceil(max * 0.15))) return 1;
  return 0;
}

interface LcMonth {
  key: string;
  label: string;
  x: number;
  weeks: (number | null)[][]; // day indices, null = other month / future
}

function buildLcMonths(width: number): LcMonth[] {
  const today = todayIndex();
  const t = dateOfIndex(today);
  let y = t.getUTCFullYear();
  let m = t.getUTCMonth();
  const blocks: Omit<LcMonth, "x">[] = [];
  // Edge-to-edge spacing between blocks = the cell gap + the month gap.
  const between = LC_MONTH_GAP + (LC_STEP - LC_CELL);
  let used = -between;
  for (let guard = 0; guard < 24; guard++) {
    const first = Math.floor(Date.UTC(y, m, 1) / DAY_MS);
    const last = Math.min(today, Math.floor(Date.UTC(y, m + 1, 0) / DAY_MS));
    // Day index 0 (1970-01-01) was a Thursday → weekday = (i + 4) % 7.
    const firstCol = first - ((first + 4) % 7);
    const weeks: (number | null)[][] = [];
    for (let col = firstCol; col <= last; col += 7) {
      weeks.push(Array.from({ length: 7 }, (_, r) => (col + r >= first && col + r <= last ? col + r : null)));
    }
    const w = weeks.length * LC_STEP - (LC_STEP - LC_CELL);
    if (blocks.length > 0 && used + between + w > width) break;
    used += between + w;
    blocks.unshift({
      key: `${y}-${m}`,
      label: new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y, m, 1))),
      weeks,
    });
    m--;
    if (m < 0) {
      m = 11;
      y--;
    }
  }
  let x = 0;
  return blocks.map((b) => {
    const out = { ...b, x };
    x += b.weeks.length * LC_STEP + LC_MONTH_GAP;
    return out;
  });
}

function LeetCodeGrid({ counts, width, height, header, onRange }: {
  counts: Map<number, number>;
  width: number;
  height: number;
  header?: (range: ActivityRange) => ReactNode;
  onRange?: (range: ActivityRange) => void;
}) {
  const reduceMotion = useReducedMotion();
  const months = useMemo(() => buildLcMonths(width), [width]);
  const hostRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ day: number; cx: number; top: number } | null>(null);
  const [tipLeft, setTipLeft] = useState(0);

  const viewW = months.length
    ? months[months.length - 1].x + months[months.length - 1].weeks.length * LC_STEP - (LC_STEP - LC_CELL)
    : 0;
  const from = months[0]?.weeks[0].find((d) => d != null) ?? todayIndex();
  const range = rangeStats(counts, from, todayIndex(), months.length);
  useReportRange(range, onRange);
  let max = 0;
  for (let i = from; i <= todayIndex(); i++) max = Math.max(max, counts.get(i) ?? 0);

  // Drawn at the true cell size; only if the parent is too short for
  // the grid + labels does it scale down (the small tier).
  const scale = Math.min(1, height > 0 ? height / LC_VIEW_H : 1);

  // Keep the popover inside the widget: measure its width once it has
  // rendered and clamp its centre.
  useLayoutEffect(() => {
    if (!tip || !tipRef.current || !hostRef.current) return;
    const w = tipRef.current.offsetWidth;
    const hostW = hostRef.current.offsetWidth;
    setTipLeft(Math.min(Math.max(tip.cx - w / 2, 0), Math.max(0, hostW - w)));
  }, [tip]);

  const tipText = (day: number) => {
    const c = counts.get(day) ?? 0;
    const d = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
      dateOfIndex(day)
    );
    return `${c} ${c === 1 ? "submission" : "submissions"} on ${d}`;
  };

  return (
    <>
      {header?.(range)}
      <div ref={hostRef} style={{ position: "relative", width: "100%" }}>
        <svg
          viewBox={`0 0 ${viewW} ${LC_VIEW_H}`}
          width={viewW * scale}
          height={LC_VIEW_H * scale}
          style={{ display: "block", margin: "0 auto", overflow: "visible" }}
          onMouseLeave={() => setTip(null)}
        >
          {months.map((mo) => (
            <g key={mo.key} transform={`translate(${mo.x} 0)`}>
              {mo.weeks.map((week, wi) =>
                week.map((day, r) => {
                  if (day == null) return null;
                  const c = counts.get(day) ?? 0;
                  const fill = c > 0 ? LC_LEVELS[lcLevel(c, max)] : LC_EMPTY;
                  return (
                    <rect
                      key={day}
                      x={wi * LC_STEP}
                      y={r * LC_STEP}
                      width={LC_CELL}
                      height={LC_CELL}
                      rx={2}
                      fill={fill}
                      style={{ cursor: "pointer" }}
                      onMouseEnter={(e) => {
                        const host = hostRef.current?.getBoundingClientRect();
                        const cell = e.currentTarget.getBoundingClientRect();
                        if (!host) return;
                        setTip({ day, cx: cell.left + cell.width / 2 - host.left, top: cell.top - host.top });
                      }}
                    />
                  );
                })
              )}
              <text
                x={(mo.weeks.length * LC_STEP - (LC_STEP - LC_CELL)) / 2}
                y={LC_LABEL_Y}
                fontSize="14px"
                fill="#AFB4BD"
                textAnchor="middle"
              >
                {mo.label}
              </text>
            </g>
          ))}
        </svg>
        <AnimatePresence>
          {tip && (
            <motion.div
              ref={tipRef}
              key="tip"
              // LeetCode's popover: fade-in + zoom-in-95.
              initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{
                position: "absolute",
                left: tipLeft,
                top: tip.top - 6,
                translateY: "-100%",
                padding: "6px 12px",
                borderRadius: 8,
                background: "rgb(51, 51, 51)",
                color: "rgb(250, 250, 250)",
                fontSize: 12,
                lineHeight: "16px",
                whiteSpace: "nowrap",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
                pointerEvents: "none",
                zIndex: 5,
              }}
            >
              {tipText(tip.day)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

/* ── GitHub variant ───────────────────────────────────────────────── */

// Identical to GitHubHeatmapWidget's grid (cells, gaps, labels, greens).
const GH_CELL = 10;
const GH_GAP = 3;
const GH_STRIDE = GH_CELL + GH_GAP;
const GH_LABEL_HEIGHT = 13;
const GH_LABEL_GAP = 4;
const GH_LEVELS = ["rgba(255, 255, 255, 0.09)", "#0e4429", "#006d32", "#26a641", "#39d353"] as const;

// Four levels on a square-root scale of the user's own busiest day, so
// a sparse history (lots of 1–3 submission days, a few big ones) still
// spreads across the greens instead of collapsing into the darkest.
function ghLevel(count: number, max: number) {
  if (count <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil(Math.sqrt(count / max) * 4)));
}

function GitHubGrid({ counts, width, header, onRange }: {
  counts: Map<number, number>;
  width: number;
  header?: (range: ActivityRange) => ReactNode;
  onRange?: (range: ActivityRange) => void;
}) {
  const weeksFit = Math.max(4, Math.floor((width + GH_GAP) / GH_STRIDE));
  const today = todayIndex();
  // Sunday-first columns; the last (current) week is cut at today.
  const lastSunday = today - ((today + 4) % 7);
  const firstSunday = lastSunday - (weeksFit - 1) * 7;
  const weeks: (number | null)[][] = [];
  for (let col = firstSunday; col <= lastSunday; col += 7) {
    weeks.push(Array.from({ length: 7 }, (_, r) => (col + r <= today ? col + r : null)));
  }

  let max = 0;
  for (let i = firstSunday; i <= today; i++) max = Math.max(max, counts.get(i) ?? 0);

  // GitHub's month-label rules (as in GitHubHeatmapWidget): label the
  // first column of a new month, never a mid-month partial in column
  // 0, never the last two columns, never within 2 columns of another.
  const labels: { week: number; label: string }[] = [];
  let lastLabel = -Infinity;
  const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
  weeks.forEach((week, wi) => {
    const d = dateOfIndex(week[0] as number);
    const prev = wi > 0 ? dateOfIndex(weeks[wi - 1][0] as number).getUTCMonth() : -1;
    if (d.getUTCMonth() === prev) return;
    if (wi === 0 && d.getUTCDate() > 7) return;
    if (wi > weeks.length - 3) return;
    if (wi - lastLabel <= 2) return;
    labels.push({ week: wi, label: monthFmt.format(d) });
    lastLabel = wi;
  });

  // "the last N months", from the number of weeks that fit.
  const monthsTouched = Math.max(1, Math.round((weeks.length * 7) / 30.44));
  const range = rangeStats(counts, firstSunday, today, monthsTouched);
  useReportRange(range, onRange);

  const gridWidth = weeks.length * GH_STRIDE - GH_GAP;
  const gridHeight = 7 * GH_STRIDE - GH_GAP;

  return (
    <div style={{ position: "relative", width: gridWidth, margin: "0 auto" }}>
      {header?.(range)}
      <div style={{ position: "relative", height: GH_LABEL_HEIGHT, marginBottom: GH_LABEL_GAP }}>
        {labels.map(({ week, label }) => (
          <span
            key={week}
            style={{
              position: "absolute",
              left: week * GH_STRIDE,
              top: 0,
              fontSize: "10px",
              fontWeight: 500,
              color: "rgba(255, 255, 255, 0.45)",
              lineHeight: `${GH_LABEL_HEIGHT}px`,
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${gridWidth} ${gridHeight}`} width={gridWidth} height={gridHeight} style={{ display: "block" }}>
        {weeks.map((week, wi) =>
          week.map((day, r) => {
            if (day == null) return null;
            const c = counts.get(day) ?? 0;
            return (
              <rect
                key={day}
                x={wi * GH_STRIDE}
                y={r * GH_STRIDE}
                width={GH_CELL}
                height={GH_CELL}
                rx={2}
                fill={GH_LEVELS[ghLevel(c, max)]}
              >
                <title>{`${c} ${c === 1 ? "submission" : "submissions"} on ${new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                }).format(dateOfIndex(day))}`}</title>
              </rect>
            );
          })
        )}
      </svg>
    </div>
  );
}

// Live content-box size of an element (re-measures on resize, e.g.
// when the widget frame morphs between size tiers).
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, box] as const;
}

/* ── Shell ────────────────────────────────────────────────────────── */

export default function ActivityHeatmap({ days, variant, header, onRange }: ActivityHeatmapProps) {
  const [hostRef, box] = useElementSize<HTMLDivElement>();
  const headRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => {
    const map = new Map<number, number>();
    for (const d of days) {
      const i = dayIndexOf(d.date);
      if (Number.isFinite(i)) map.set(i, (map.get(i) ?? 0) + d.count);
    }
    return map;
  }, [days]);

  // For the LeetCode variant the header sits in normal flow above the
  // grid; whatever height is left is the grid's budget.
  const [headH, setHeadH] = useState(0);
  useLayoutEffect(() => {
    if (headRef.current) setHeadH(headRef.current.offsetHeight);
  });

  return (
    <div
      ref={hostRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {box && box.width > 0 &&
        (variant === "leetcode" ? (
          <LeetCodeGrid
            counts={counts}
            width={box.width}
            height={box.height - headH}
            header={header ? (r) => <div ref={headRef}>{header(r)}</div> : undefined}
            onRange={onRange}
          />
        ) : (
          <GitHubGrid counts={counts} width={box.width} header={header} onRange={onRange} />
        ))}
    </div>
  );
}
