"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { WIDGET_RADIUS } from "@/lib/widgetGrid";
import { useLiquidGlass } from "@/lib/liquidGlass";
import type { WidgetSize } from "@/lib/widgetLayoutSchema";
import ActivityHeatmap, { useElementSize, type ActivityDay } from "@/components/widgets/ActivityHeatmap";
import WidgetViewToggle, {
  GridGlyph,
  RingGlyph,
  TOGGLE_RIGHT,
  TOGGLE_TOP,
  TOGGLE_WIDTH,
  WidgetHeader,
  LeetCodeMark,
} from "@/components/widgets/WidgetViewToggle";

const PROFILE_URL = "https://leetcode.com/u/shajith240/";

interface LeetCodeData {
  totalSolved: number;
  totalQuestions: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalEasy: number;
  totalMedium: number;
  totalHard: number;
  acceptance: number;
  submissionCount: number;
  beats: Record<Difficulty, number | null>;
  attempting: { all: number } & Record<Difficulty, number>;
  submissionCalendar: Record<string, number>;
}

type Difficulty = "easy" | "medium" | "hard";
type HoverState = "rest" | "ring" | Difficulty;
type View = "solved" | "activity";

// Module-level client cache: one network request per page load, shared
// by every mount (tier changes, the phone /coding page, remounts).
let cached: LeetCodeData | null = null;
let pending: Promise<LeetCodeData | null> | null = null;

function fetchLeetCode(): Promise<LeetCodeData | null> {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = fetch("/api/leetcode")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || d.error) return null;
        cached = d as LeetCodeData;
        return cached;
      })
      .catch(() => null)
      .finally(() => {
        // A failure shouldn't be cached forever — the next mount retries.
        if (!cached) pending = null;
      });
  }
  return pending;
}

// Same entrance spring as the GitHub widget.
const ENTRANCE_SPRING = { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 } as const;

/* ── LeetCode's profile progress ring, reproduced ───────────────────

   Measured on leetcode.com/u/shajith240 (dark mode). Geometry, colours
   and timing are LeetCode's own:

   - Circles r=42 in a 100×100 viewBox, stroke 3, round caps,
     dashoffset 66 (≈ C/4, so a dash starts at 12 o'clock), all clipped
     by LeetCode's 270° "bar-mask" path (verbatim below).
   - LeetCode's code treats the circumference as 264 (its dasharrays
     always sum to 264, not 2π·42), the gap between segments as 2.25%
     of it (5.94 ≈ 8.1°) and the usable arc as 270° minus two gaps
     (186.12). Each group's rotation = previous rotation + (previous
     length + gap) / 264 × 360, starting at 225°.
   - Groups and circles transition `all 400ms cubic-bezier(.6,1.37,
     .81,.97)` — LeetCode's springy overshoot.
   - A geometry change is TWO phases (sampled frame by frame on the
     live page): first every circle except the third group's track
     gets LeetCode's `hide` keyframe (opacity held to 20%, then → 0)
     while the ring COLLAPSES — all groups to 225°, all dashes to 0
     except that track, which becomes the whole 270° arc in #434343,
     fills → transparent. 300ms later `hide` is dropped, the `show`
     keyframe replays (opacity 0 → 1 by 80%) and everything springs
     out to the new layout. Hovering the ring itself changes no
     geometry, so only the centre text swaps.
   These are deliberately CSS transitions/keyframes, NOT Framer Motion:
   they reproduce LeetCode's own CSS exactly (the same declarations
   interpolating the same dasharray/rotate/stroke values, and its two
   opacity-only keyframes), which is what makes mid-flight frames
   match. */

const C = 264;
const GAP = C * 0.0225;
const ARC = C * 0.75 - 2 * GAP;
const START_ROTATION = 225;
const RING_TRANSITION = "all 400ms cubic-bezier(.6,1.37,.81,.97)";
const BAR_MASK =
  "M21.3622 21.3622C5.54592 37.1784 5.54592 62.8216 21.3622 78.6378C21.9479 79.2236 21.9479 80.1734 21.3622 80.7591C20.7764 81.3449 19.8266 81.3449 19.2408 80.7591C2.25303 63.7713 2.25303 36.2287 19.2408 19.2409C36.2286 2.25305 63.7713 2.25305 80.7591 19.2409C97.7469 36.2287 97.7469 63.7713 80.7591 80.7591C80.1733 81.3449 79.2236 81.3449 78.6378 80.7591C78.052 80.1734 78.052 79.2236 78.6378 78.6378C94.454 62.8216 94.454 37.1784 78.6378 21.3622C62.8216 5.54594 37.1784 5.54594 21.3622 21.3622Z";

const COLORS: Record<Difficulty, { rgb: string; label: string }> = {
  easy: { rgb: "28, 186, 186", label: "Easy" },
  medium: { rgb: "255, 183, 0", label: "Med." },
  hard: { rgb: "246, 55, 55", label: "Hard" },
};
const DIFFS: Difficulty[] = ["easy", "medium", "hard"];
const FOREGROUND = "rgb(245, 245, 245)";
const MUTED = "rgb(168, 168, 168)";
const SUCCESS = "rgb(2, 151, 39)";
const HOVER_TRACK = "#434343";
const ATTEMPTING_STROKE = "rgba(245, 245, 245, 0.2)";
const SKELETON_STROKE = "rgba(255, 255, 255, 0.08)";
const COLLAPSE_MS = 300;
const RING_KEYFRAMES = `
@keyframes lcRingCircleShow { 0% { opacity: 0; } 80% { opacity: 1; } 100% { opacity: 1; } }
@keyframes lcRingCircleHide { 0% { opacity: 1; } 20% { opacity: 1; } 100% { opacity: 0; } }
`;

interface Segment {
  rotation: number;
  track: { len: number; stroke: string };
  fill: { len: number; stroke: string };
}

function layOut(lengths: number[]) {
  const rotations: number[] = [];
  let rot = START_ROTATION;
  for (const len of lengths) {
    rotations.push(rot);
    rot += ((len + GAP) / C) * 360;
  }
  return rotations;
}

function totalOf(d: LeetCodeData, k: Difficulty) {
  return k === "easy" ? d.totalEasy : k === "medium" ? d.totalMedium : d.totalHard;
}
function solvedOf(d: LeetCodeData, k: Difficulty) {
  return k === "easy" ? d.easySolved : k === "medium" ? d.mediumSolved : d.hardSolved;
}

type GeometryKey = "none" | "rest" | Difficulty;

// The collapsed in-between state of LeetCode's two-phase transition.
function collapsedSegments(trackStroke: string): Segment[] {
  return [0, 1, 2].map((i) => ({
    rotation: START_ROTATION,
    track: { len: i === 2 ? C * 0.75 : 0, stroke: trackStroke },
    fill: { len: 0, stroke: "transparent" },
  }));
}

function segmentsFor(data: LeetCodeData, key: Exclude<GeometryKey, "none">): Segment[] {
  if (key === "rest") {
    const sum = DIFFS.reduce((a, k) => a + totalOf(data, k), 0) || 1;
    const lens = DIFFS.map((k) => (totalOf(data, k) / sum) * ARC);
    const rots = layOut(lens);
    return DIFFS.map((k, i) => ({
      rotation: rots[i],
      track: { len: lens[i], stroke: `rgba(${COLORS[k].rgb}, 0.2)` },
      fill: { len: lens[i] * (solvedOf(data, k) / (totalOf(data, k) || 1)), stroke: `rgb(${COLORS[k].rgb})` },
    }));
  }
  // A difficulty card is hovered: the same three groups re-plot that
  // difficulty's own breakdown — solved / attempting / untouched.
  const total = totalOf(data, key) || 1;
  const solved = solvedOf(data, key);
  const attempting = data.attempting?.[key] ?? 0;
  const parts = [solved, attempting, Math.max(0, total - solved - attempting)];
  const lens = parts.map((p) => (p / total) * ARC);
  const rots = layOut(lens);
  const fills = [`rgb(${COLORS[key].rgb})`, ATTEMPTING_STROKE, "transparent"];
  return lens.map((len, i) => ({
    rotation: rots[i],
    track: { len, stroke: HOVER_TRACK },
    fill: { len, stroke: fills[i] },
  }));
}

function Ring({ data, state, onHover }: {
  data: LeetCodeData | null;
  state: HoverState;
  onHover?: (hovering: boolean) => void;
}) {
  const clipId = `lc-bar-mask-${useId().replace(/:/g, "")}`;
  const reduceMotion = !!useReducedMotion();
  const transition = reduceMotion ? "none" : RING_TRANSITION;

  // Which layout the ring should end up in. Ring hover shares the
  // rest layout (LeetCode only swaps the centre text).
  const key: GeometryKey = !data ? "none" : state === "ring" ? "rest" : state;
  // What's drawn right now: a settled layout, or the collapsed
  // in-between ("hiding" = LeetCode's hide class is on). The ring
  // starts collapsed, so the first layout "draws" in on mount.
  const [shown, setShown] = useState<{ key: GeometryKey; hiding: boolean }>({ key: "none", hiding: false });
  useEffect(() => {
    if (key === "none") return;
    if (reduceMotion) {
      setShown({ key, hiding: false });
      return;
    }
    // Collapse first (only an EXPANDED ring gets the hide fade — a
    // ring that's already collapsed just keeps waiting), then expand
    // to the newest target 300ms later.
    setShown((cur) => (cur.key === key && !cur.hiding ? cur : { key: "none", hiding: cur.key !== "none" || cur.hiding }));
    const t = setTimeout(() => setShown({ key, hiding: false }), COLLAPSE_MS);
    return () => clearTimeout(t);
  }, [key, reduceMotion]);

  const segments =
    data && shown.key !== "none" ? segmentsFor(data, shown.key) : collapsedSegments(data ? HOVER_TRACK : SKELETON_STROKE);
  const animation = (alwaysShown: boolean) =>
    reduceMotion
      ? undefined
      : shown.hiding && !alwaysShown
        ? "lcRingCircleHide 0.4s linear both"
        : "lcRingCircleShow 0.4s linear both";

  const circle = (len: number, stroke: string, alwaysShown = false): CSSProperties => ({
    animation: animation(alwaysShown),
    strokeWidth: 3,
    strokeLinecap: "round",
    strokeDasharray: `${len} ${C - len}`,
    strokeDashoffset: 66,
    stroke,
    fill: "transparent",
    transition,
  });

  // Centre text: stacked layers, only one visible. The incoming layer
  // waits 200ms (LeetCode's delay-200) while the outgoing one fades
  // immediately, so the two never overlap.
  const layer = (visible: boolean): CSSProperties => ({
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    fontSize: 14,
    lineHeight: "20px",
    color: FOREGROUND,
    whiteSpace: "nowrap",
    pointerEvents: "none",
    opacity: visible ? 1 : 0,
    transition: "opacity 200ms",
    transitionDelay: visible ? "200ms" : "0ms",
  });
  const bottom = (visible: boolean): CSSProperties => ({
    position: "absolute",
    left: "50%",
    bottom: "5%",
    transform: "translateX(-50%)",
    whiteSpace: "nowrap",
    fontSize: 12,
    lineHeight: "16px",
    color: MUTED,
    pointerEvents: "none",
    opacity: visible ? 1 : 0,
    transition: "opacity 200ms",
    transitionDelay: visible ? "200ms" : "0ms",
  });
  const big = { fontSize: 30, fontWeight: 600, lineHeight: "32px" } as const;
  const split = (n: number) => {
    const [int, dec] = n.toFixed(2).split(".");
    return (
      <div>
        <span style={big}>{int}</span>
        <span>.{dec}%</span>
      </div>
    );
  };
  const show = (s: HoverState) => !!data && state === s;

  return (
    <div
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      style={{ position: "relative", width: 160, height: 160, flex: "none", overflow: "hidden" }}
    >
      <style>{RING_KEYFRAMES}</style>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "113%",
          height: "113%",
          transform: "translate(-50%, -44%)",
        }}
      >
        <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", fill: "transparent" }}>
          <defs>
            <clipPath id={clipId}>
              <path fillRule="evenodd" clipRule="evenodd" d={BAR_MASK} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            {segments.map((s, i) => (
              <g key={i} style={{ transform: `rotate(${s.rotation}deg)`, transformOrigin: "center", transition }}>
                {/* The third group's track never hides: it is the grey
                    270° arc the ring collapses into. */}
                <circle cx="50" cy="50" r="42" style={circle(s.track.len, s.track.stroke, i === 2)} />
                <circle cx="50" cy="50" r="42" style={circle(s.fill.len, s.fill.stroke)} />
              </g>
            ))}
          </g>
        </svg>
      </div>
      {data && (
        <div style={{ position: "absolute", inset: 0 }}>
          <div style={layer(show("rest"))}>
            <div>
              <span style={big}>{data.totalSolved}</span>
              <span>/{data.totalQuestions}</span>
            </div>
            <div style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  right: "calc(100% + 2px)",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 14,
                  height: 14,
                  display: "grid",
                  placeItems: "center",
                  color: SUCCESS,
                }}
              >
                <svg viewBox="0 0 448 512" width="10.5" height="12" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M441 103c9.4 9.4 9.4 24.6 0 33.9L177 401c-9.4 9.4-24.6 9.4-33.9 0L7 265c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l119 119L407 103c9.4-9.4 24.6-9.4 33.9 0z"
                  />
                </svg>
              </div>
              Solved
            </div>
          </div>
          <div style={layer(show("ring"))}>
            {split(data.acceptance)}
            <div>Acceptance</div>
          </div>
          {DIFFS.map((k) => (
            <div key={k} style={layer(show(k))}>
              <div>Beats</div>
              {data.beats?.[k] != null ? split(data.beats[k] as number) : <div style={big}>–</div>}
            </div>
          ))}
          <div style={bottom(show("rest"))}>
            <span style={{ fontWeight: 600 }}>{data.attempting?.all ?? 0}</span> Attempting
          </div>
          <div style={bottom(show("ring"))}>
            <span style={{ fontWeight: 600 }}>{data.submissionCount}</span> submission
          </div>
          {DIFFS.map((k) => (
            <div key={k} style={bottom(show(k))}>
              <span style={{ fontWeight: 600 }}>{data.attempting?.[k] ?? 0}</span> Attempting
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// LeetCode's card in design pixels: 148 tall, a flexible ring panel
// holding the 160px ring container, an 8px gap and a 90px column of
// three difficulty cards. The widget scales this whole unit uniformly
// (CSS transform) so every proportion stays exact.
const DESIGN_H = 148;
const COLUMN_W = 90;
const GAP_PX = 8;
const MIN_DESIGN_W = 160 + GAP_PX + COLUMN_W;

function SolvedView({ data, ringOnly }: {
  data: LeetCodeData | null;
  ringOnly: boolean;
}) {
  const [hostRef, box] = useElementSize<HTMLDivElement>();
  const [state, setState] = useState<HoverState>("rest");

  const w = box?.width ?? 0;
  const h = box?.height ?? 0;
  const ringHover = (on: boolean) => setState(on ? "ring" : "rest");

  let content = null;
  if (box && w > 0 && h > 0) {
    if (ringOnly) {
      const s = Math.min(w, h) / 160;
      content = (
        <div style={{ width: 160 * s, height: 160 * s }}>
          <div style={{ width: 160, height: 160, transform: `scale(${s})`, transformOrigin: "0 0" }}>
            <Ring data={data} state={state} onHover={ringHover} />
          </div>
        </div>
      );
    } else {
      const s = Math.min(h / DESIGN_H, w / MIN_DESIGN_W);
      const designW = w / s;
      content = (
        <div style={{ width: w, height: DESIGN_H * s }}>
          <div
            style={{
              width: designW,
              height: DESIGN_H,
              display: "flex",
              gap: GAP_PX,
              transform: `scale(${s})`,
              transformOrigin: "0 0",
            }}
          >
            <div
              style={{
                position: "relative",
                flex: 1,
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                borderRadius: 5,
              }}
            >
              <Ring data={data} state={state} onHover={ringHover} />
            </div>
            <div
              style={{
                width: COLUMN_W,
                flex: "none",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: GAP_PX,
              }}
            >
              {DIFFS.map((k) => (
                <div
                  key={k}
                  onMouseEnter={() => data && setState(k)}
                  onMouseLeave={() => setState("rest")}
                  style={{
                    flex: 1,
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    borderRadius: 5,
                    background: "rgba(255, 255, 255, 0.06)",
                    fontSize: 12,
                    lineHeight: "16px",
                    fontWeight: 500,
                  }}
                >
                  {data ? (
                    <>
                      <div style={{ color: `rgb(${COLORS[k].rgb})` }}>{COLORS[k].label}</div>
                      <div style={{ color: FOREGROUND }}>
                        {solvedOf(data, k)}/{totalOf(data, k)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ width: 30, height: 10, borderRadius: 3, background: SKELETON_STROKE }} />
                      <div style={{ width: 48, height: 10, borderRadius: 3, background: SKELETON_STROKE, marginTop: 4 }} />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div
      ref={hostRef}
      style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {content}
    </div>
  );
}

/* ── Activity: LeetCode's own submission heatmap ───────────────────── */

function ActivityView({ data, size }: { data: LeetCodeData | null; size: WidgetSize }) {
  const days = useMemo<ActivityDay[]>(
    () =>
      Object.entries(data?.submissionCalendar ?? {}).map(([sec, count]) => ({
        date: new Date(Number(sec) * 1000).toISOString().slice(0, 10),
        count,
      })),
    [data]
  );
  const small = size === "small";
  return (
    <ActivityHeatmap
      days={days}
      variant="leetcode"
      header={(r) => (
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, whiteSpace: "nowrap", overflow: "hidden" }}>
            <span style={{ fontSize: small ? 14 : 16, fontWeight: 500, color: "#fff", lineHeight: "19px" }}>
              {data ? r.total : "–"}
            </span>
            <span
              style={{
                fontSize: small ? 11 : 12,
                color: "rgba(239, 241, 246, 0.75)",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {small ? "submissions" : `submissions in the past ${r.months === 1 ? "month" : `${r.months} months`}`}
            </span>
          </div>
          {size === "large" && data && (
            <div style={{ display: "flex", gap: 16, marginTop: 2, fontSize: 12, lineHeight: "16px" }}>
              <span style={{ color: "rgba(239, 242, 246, 0.6)" }}>
                Total active days: <span style={{ fontWeight: 500, color: "rgba(239, 241, 246, 0.75)" }}>{r.activeDays}</span>
              </span>
              <span style={{ color: "rgba(239, 242, 246, 0.6)" }}>
                Max streak: <span style={{ fontWeight: 500, color: "rgba(239, 241, 246, 0.75)" }}>{r.maxStreak}</span>
              </span>
            </div>
          )}
        </div>
      )}
    />
  );
}

/* ── Widget ────────────────────────────────────────────────────────── */

const PADDING = 14;

export default function LeetCodeWidget({ size }: { size: WidgetSize }) {
  const [data, setData] = useState<LeetCodeData | null>(cached);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<View>("solved");
  const reduceMotion = useReducedMotion();
  const downAt = useRef<{ x: number; y: number } | null>(null);
  const lgRef = useLiquidGlass<HTMLDivElement>({ radius: WIDGET_RADIUS, bezel: 14, strength: 0.6, blur: 5, brightness: 0.88, tint: 0.18 });

  useEffect(() => {
    if (cached) return;
    let alive = true;
    fetchLeetCode().then((d) => {
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

  // Body click opens the profile — unless the pointer travelled (a drag
  // in edit mode), mirroring how a tap differs from a drag on iOS.
  const openProfile = (e: React.MouseEvent) => {
    const d = downAt.current;
    if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return;
    window.open(PROFILE_URL, "_blank", "noopener,noreferrer");
  };

  const swap = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : {
        // Each view lives on its own side (solved left, activity right):
        // it enters from and leaves toward that side, so the pair reads
        // as one subtle slide whichever way you switch.
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
      title={failed ? undefined : "Open LeetCode profile"}
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
      <WidgetHeader icon={<LeetCodeMark />} name="LeetCode" reserveRight={reserveRight} />
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
              style={{ fontSize: 12, fontWeight: 500, color: "rgb(255, 161, 22)", textDecoration: "none" }}
            >
              View profile ↗
            </a>
          </div>
        ) : stacked ? (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
            {/* 136 = the 148px LeetCode card at 0.92, leaving the
                heatmap below its full 1:1 size. */}
            <div style={{ flex: "none", height: 136 }}>
              <SolvedView data={data} ringOnly={false} />
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ActivityView data={data} size={size} />
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <motion.div key={view} {...swap} style={{ position: "absolute", inset: 0 }}>
              {view === "solved" ? (
                <SolvedView data={data} ringOnly={size === "small"} />
              ) : (
                <ActivityView data={data} size={size} />
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
            { id: "solved", label: "Solved problems", icon: <RingGlyph /> },
            { id: "activity", label: "Submission activity", icon: <GridGlyph /> },
          ]}
          style={{ top: TOGGLE_TOP, right: TOGGLE_RIGHT }}
        />
      )}
    </motion.div>
  );
}
