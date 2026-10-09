"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { WIDGET_RADIUS } from "@/lib/widgetGrid";
import { useLiquidGlass } from "@/lib/liquidGlass";
import type { WidgetSize } from "@/lib/widgetLayoutSchema";
import ActivityHeatmap, { useElementSize, type ActivityDay, type ActivityRange } from "@/components/widgets/ActivityHeatmap";
import WidgetViewToggle, {
  ChartGlyph,
  GridGlyph,
  HEADER_GAP,
  HEADER_HEIGHT,
  TOGGLE_RIGHT,
  TOGGLE_TOP,
  TOGGLE_WIDTH,
  WidgetHeader,
  CodeforcesMark,
} from "@/components/widgets/WidgetViewToggle";

const PROFILE_URL = "https://codeforces.com/profile/shajith240";

interface CodeforcesData {
  rating: number | null;
  maxRating: number | null;
  rank: string | null;
  maxRank: string | null;
  ratingHistory: { name: string; time: number; rating: number }[];
  activity: Record<string, number>;
}

type View = "rating" | "activity";

// Module-level client cache: one request per page load for every mount.
let cached: CodeforcesData | null = null;
let pending: Promise<CodeforcesData | null> | null = null;

function fetchCodeforces(): Promise<CodeforcesData | null> {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = fetch("/api/codeforces")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || d.error) return null;
        cached = d as CodeforcesData;
        return cached;
      })
      .catch(() => null)
      .finally(() => {
        if (!cached) pending = null;
      });
  }
  return pending;
}

const ENTRANCE_SPRING = { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 } as const;

/* Codeforces rank colours. The official hues are newbie #808080,
   pupil #008000, specialist #03a89e, expert #0000ff, candidate master
   #aa00aa, master / international master #ff8c00, grandmaster and up
   #ff0000. Several are too dark to read on dark glass (pure #0000ff on
   a near-black material is almost invisible), so `text` is a lighter
   shade of the SAME hue — only the lightness is adjusted, never the
   hue. `band` is the pale band colour Codeforces' own rating graph
   uses for that range. */
const RANKS = [
  { min: -Infinity, max: 1200, official: "#808080", text: "#a3a3a3", band: "204, 204, 204" },
  { min: 1200, max: 1400, official: "#008000", text: "#3fbf3f", band: "119, 255, 119" },
  { min: 1400, max: 1600, official: "#03a89e", text: "#2ad1c6", band: "119, 221, 187" },
  { min: 1600, max: 1900, official: "#0000ff", text: "#7a8cff", band: "170, 170, 255" },
  { min: 1900, max: 2100, official: "#aa00aa", text: "#d566d5", band: "255, 136, 255" },
  { min: 2100, max: 2300, official: "#ff8c00", text: "#ffa333", band: "255, 204, 136" },
  { min: 2300, max: 2400, official: "#ff8c00", text: "#ffa333", band: "255, 187, 85" },
  { min: 2400, max: 2600, official: "#ff0000", text: "#ff5c5c", band: "255, 119, 119" },
  { min: 2600, max: 3000, official: "#ff0000", text: "#ff5c5c", band: "255, 51, 51" },
  { min: 3000, max: Infinity, official: "#ff0000", text: "#ff5c5c", band: "170, 0, 0" },
] as const;

const rankFor = (rating: number) => RANKS.find((r) => rating >= r.min && rating < r.max) ?? RANKS[0];

// "candidate master" → "Candidate Master", as the profile page shows it.
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

// Codeforces' own rating-graph line colour.
const LINE = "rgb(237, 194, 64)";

/* ── Rating graph (hand-drawn SVG, Codeforces style) ─────────────── */

function RatingGraph({ history }: { history: CodeforcesData["ratingHistory"] }) {
  const [hostRef, box] = useElementSize<HTMLDivElement>();
  const clipId = `cf-graph-${useId().replace(/:/g, "")}`;
  const w = box?.width ?? 0;
  const h = box?.height ?? 0;

  const LEFT = 26; // tick-label gutter
  const PAD_Y = 6;
  const PAD_X = 5;

  const graph = useMemo(() => {
    if (!history.length || w <= LEFT || h <= 0) return null;
    const ratings = history.map((p) => p.rating);
    let lo = Math.min(...ratings) - 60;
    let hi = Math.max(...ratings) + 60;
    if (hi - lo < 300) {
      const mid = (hi + lo) / 2;
      lo = mid - 150;
      hi = mid + 150;
    }
    const t0 = history[0].time;
    const t1 = history[history.length - 1].time;
    const plotW = w - LEFT - PAD_X * 2;
    const x = (t: number) => LEFT + PAD_X + (t1 === t0 ? plotW / 2 : ((t - t0) / (t1 - t0)) * plotW);
    const y = (r: number) => PAD_Y + (1 - (r - lo) / (hi - lo)) * (h - PAD_Y * 2);
    const bands = RANKS.filter((r) => r.max > lo && r.min < hi).map((r) => {
      const top = y(Math.min(r.max, hi));
      const bottom = y(Math.max(r.min, lo));
      return { key: r.min, top, height: bottom - top, band: r.band, boundary: r.min > lo ? r.min : null };
    });
    return { x, y, bands, points: history.map((p) => ({ ...p, px: x(p.time), py: y(p.rating) })) };
  }, [history, w, h]);

  return (
    <div ref={hostRef} style={{ width: "100%", height: "100%" }}>
      {graph && (
        <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
          <defs>
            <clipPath id={clipId}>
              <rect x={LEFT} y={0} width={w - LEFT} height={h} rx={5} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            {graph.bands.map((b) => (
              <rect key={b.key} x={LEFT} y={b.top} width={w - LEFT} height={b.height} fill={`rgba(${b.band}, 0.1)`} />
            ))}
          </g>
          {graph.bands.map(
            (b) =>
              b.boundary != null && (
                <text
                  key={`t${b.key}`}
                  x={LEFT - 4}
                  y={graph.y(b.boundary)}
                  dy="0.32em"
                  textAnchor="end"
                  fontSize="8.5"
                  fill="rgba(255, 255, 255, 0.45)"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {b.boundary}
                </text>
              )
          )}
          <polyline
            points={graph.points.map((p) => `${p.px},${p.py}`).join(" ")}
            fill="none"
            stroke={LINE}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {graph.points.map((p, i) => (
            <circle key={i} cx={p.px} cy={p.py} r={2.3} fill="#fff" stroke={LINE} strokeWidth={1.3}>
              <title>{`${p.name}: ${p.rating}`}</title>
            </circle>
          ))}
        </svg>
      )}
    </div>
  );
}

/* ── Views ─────────────────────────────────────────────────────────── */

function RatingSummary({ data, size }: { data: CodeforcesData | null; size: WidgetSize }) {
  const rating = data?.rating ?? null;
  const rank = rating != null ? rankFor(rating) : null;
  const maxRank = data?.maxRating != null ? rankFor(data.maxRating) : null;
  const big = size === "small" ? 44 : 40;
  const skeleton = { borderRadius: 4, background: "rgba(255, 255, 255, 0.08)" } as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {data ? (
        <>
          <span style={{ fontSize: 13, fontWeight: 600, color: rank?.text, lineHeight: 1.2 }}>
            {data.rank ? titleCase(data.rank) : "Unrated"}
          </span>
          <span
            style={{
              fontSize: big,
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: rank?.text ?? "rgba(255, 255, 255, 0.85)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {rating ?? "–"}
          </span>
          {data.maxRating != null && (
            <span style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.5)", marginTop: 3 }}>
              max <span style={{ fontWeight: 600, color: maxRank?.text }}>{data.maxRating}</span>
            </span>
          )}
        </>
      ) : (
        <>
          <div style={{ ...skeleton, width: 52, height: 12 }} />
          <div style={{ ...skeleton, width: 92, height: big * 0.8, marginTop: 4 }} />
          <div style={{ ...skeleton, width: 48, height: 10, marginTop: 5 }} />
        </>
      )}
    </div>
  );
}

function RatingView({ data, size }: { data: CodeforcesData | null; size: WidgetSize }) {
  if (size === "small") {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        <RatingSummary data={data} size={size} />
      </div>
    );
  }
  return (
    <div style={{ height: "100%", display: "flex", gap: 12 }}>
      <div style={{ flex: "none", width: 108, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        <RatingSummary data={data} size={size} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex" }}>
        {data && data.ratingHistory.length > 0 ? (
          <RatingGraph history={data.ratingHistory} />
        ) : (
          <div
            style={{
              flex: 1,
              borderRadius: 5,
              background: "rgba(255, 255, 255, 0.05)",
              display: "grid",
              placeItems: "center",
              fontSize: 11,
              color: "rgba(255, 255, 255, 0.4)",
            }}
          >
            {data ? "No rated contests yet" : null}
          </div>
        )}
      </div>
    </div>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const activitySummary = (r: ActivityRange) =>
  `${plural(r.total, "submission")} in the last ${plural(r.months, "month")}`;

// The activity heatmap. Medium/small report their range up so the
// brand header can carry it ("Codeforces · N submissions …"); the
// large tier, where the header already belongs to the rating section,
// gets its own line in the same type.
function ActivityView({ data, ownHeader, onRange }: {
  data: CodeforcesData | null;
  ownHeader: boolean;
  onRange?: (r: ActivityRange) => void;
}) {
  const days = useMemo<ActivityDay[]>(
    () => Object.entries(data?.activity ?? {}).map(([date, count]) => ({ date, count })),
    [data]
  );
  return (
    <ActivityHeatmap
      days={days}
      variant="github"
      onRange={onRange}
      header={
        ownHeader
          ? (r) => (
              <div
                style={{
                  height: HEADER_HEIGHT,
                  marginBottom: HEADER_GAP,
                  fontSize: "10px",
                  lineHeight: `${HEADER_HEIGHT}px`,
                  fontWeight: 600,
                  color: "rgba(255, 255, 255, 0.55)",
                  letterSpacing: "0.01em",
                  whiteSpace: "nowrap",
                }}
              >
                {data ? activitySummary(r) : null}
              </div>
            )
          : undefined
      }
    />
  );
}

/* ── Widget ────────────────────────────────────────────────────────── */

const PADDING = 14;

export default function CodeforcesWidget({ size }: { size: WidgetSize }) {
  const [data, setData] = useState<CodeforcesData | null>(cached);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<View>("rating");
  const reduceMotion = useReducedMotion();
  const downAt = useRef<{ x: number; y: number } | null>(null);
  const lgRef = useLiquidGlass<HTMLDivElement>({ radius: WIDGET_RADIUS, bezel: 14, strength: 0.6, blur: 5, brightness: 0.88, tint: 0.18 });

  useEffect(() => {
    if (cached) return;
    let alive = true;
    fetchCodeforces().then((d) => {
      if (!alive) return;
      if (d) setData(d);
      else setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const stacked = size === "large";
  // The header's text stops short of the toggle on its line (+6 gap).
  const reserveRight = stacked ? 0 : TOGGLE_RIGHT + TOGGLE_WIDTH + 6 - PADDING;
  const [range, setRange] = useState<ActivityRange | null>(null);
  // Medium activity view: the range rides on the brand header, the way
  // the GitHub widget's header names its graph. (Small has no room.)
  const headerSuffix =
    size === "medium" && view === "activity" && data && range ? ` · ${activitySummary(range)}` : null;

  // Body click opens the profile, unless the pointer travelled (drag).
  const openProfile = (e: React.MouseEvent) => {
    const d = downAt.current;
    if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return;
    window.open(PROFILE_URL, "_blank", "noopener,noreferrer");
  };

  const swap = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : {
        // Rating lives on the left, activity on the right: each view
        // enters from and leaves toward its own side.
        initial: { opacity: 0, x: view === "activity" ? 10 : -10 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: view === "activity" ? 10 : -10 },
        transition: { duration: 0.22, ease: [0, 0, 0.58, 1] as const },
      };

  return (
    <motion.div
      ref={lgRef}
      className="liquid-glass"
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={ENTRANCE_SPRING}
      onPointerDown={(e) => (downAt.current = { x: e.clientX, y: e.clientY })}
      onClick={failed ? undefined : openProfile}
      title={failed ? undefined : "Open Codeforces profile"}
      style={{
        width: "100%",
        height: "100%",
        padding: PADDING,
        borderRadius: WIDGET_RADIUS,
        boxSizing: "border-box",
        cursor: failed ? "default" : "pointer",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <WidgetHeader icon={<CodeforcesMark />} name="Codeforces" suffix={headerSuffix} reserveRight={reserveRight} />
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {failed ? (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.55)" }}>Stats are unavailable right now.</span>
            <a
              href={PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, fontWeight: 500, color: "#5aa9e6", textDecoration: "none" }}
            >
              View profile ↗
            </a>
          </div>
        ) : stacked ? (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ flex: 1, minHeight: 0 }}>
              <RatingView data={data} size={size} />
            </div>
            {/* header line + month labels + the 7-row grid */}
            <div style={{ flex: "none", height: 125 }}>
              <ActivityView data={data} ownHeader />
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <motion.div key={view} {...swap} style={{ position: "absolute", inset: 0 }}>
              {view === "rating" ? (
                <RatingView data={data} size={size} />
              ) : (
                <ActivityView data={data} ownHeader={false} onRange={setRange} />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
      {!stacked && !failed && (
        <WidgetViewToggle
          value={view}
          onChange={setView}
          options={[
            { id: "rating", label: "Rating", icon: <ChartGlyph /> },
            { id: "activity", label: "Submission activity", icon: <GridGlyph /> },
          ]}
          style={{ top: TOGGLE_TOP, right: TOGGLE_RIGHT }}
        />
      )}
    </motion.div>
  );
}
