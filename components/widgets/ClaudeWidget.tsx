"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { WIDGET_RADIUS } from "@/lib/widgetGrid";
import { useLiquidGlass } from "@/lib/liquidGlass";
import type { WidgetSize } from "@/lib/widgetLayoutSchema";
import WidgetViewToggle, {
  ChartGlyph,
  TOGGLE_RIGHT,
  TOGGLE_TOP,
  TOGGLE_WIDTH,
  WidgetHeader,
} from "@/components/widgets/WidgetViewToggle";
import {
  compact,
  MODEL_FAMILIES,
  recentActions,
  summarize,
  type ClaudeActivity,
  type ModelFamily,
} from "@/lib/claudeStats";
import activity from "@/data/claudeActivity.json";

/* Claude widget — not "I use AI" but HOW I use it: how much work the
   agent carries per instruction, how I route work across models, how
   much I parallelise with sub-agents, and how lean my context is.
   Numbers come from my own Claude Code logs, exported as daily counts
   only (scripts/export-claude-activity.mjs → data/claudeActivity.json;
   ratios in lib/claudeStats.ts).

   Two views, like the LeetCode/Codeforces widgets:
   - "How I work": the effectiveness numbers + the model-routing bar;
   - "Activity": agent actions per day, recent days as bars.
   Large shows both, stacked. */

const DATA = activity as ClaudeActivity;
const ENTRANCE_SPRING = { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 } as const;
const PADDING = 14;

// Claude's brand orange, and two lighter steps of it for the smaller
// model families, so the routing bar reads as one brand, three shares.
const CLAUDE = "#D97757";
const MODEL_COLOR: Record<ModelFamily, string> = { opus: CLAUDE, sonnet: "#E8A07E", haiku: "#F2CDB6" };
const MODEL_NAME: Record<ModelFamily, string> = { opus: "Opus", sonnet: "Sonnet", haiku: "Haiku" };

const LABEL = "rgba(255, 255, 255, 0.55)";
const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const weekdayFmt = new Intl.DateTimeFormat("en-US", { weekday: "narrow", timeZone: "UTC" });
const asDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

type View = "work" | "activity";

const ClaudeMark = () => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src="/logos/claude.svg" alt="" width={12} height={12} style={{ display: "block", flex: "none" }} />
);

function SparkGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
      <path d="M5 0.8v8.4M0.8 5h8.4M2 2l6 6M8 2 2 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/* ── How I work ───────────────────────────────────────────────────── */

function Stat({ value, label, big }: { value: string; label: string; big?: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: big ? 34 : 22,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
          color: "#fff",
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
      <div style={{ marginTop: 4, fontSize: big ? 11.5 : 10.5, lineHeight: 1.25, color: LABEL }}>{label}</div>
    </div>
  );
}

function RoutingBar({ share, compactLegend }: { share: Record<ModelFamily, number>; compactLegend?: boolean }) {
  const shown = MODEL_FAMILIES.filter((f) => share[f] > 0);
  return (
    <div title={`Turns by model: ${shown.map((f) => `${MODEL_NAME[f]} ${share[f]}%`).join(", ")}`}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        {!compactLegend && <span style={{ fontSize: 10.5, color: LABEL, whiteSpace: "nowrap" }}>Model routing</span>}
        <span style={{ display: "flex", gap: compactLegend ? 6 : 9, fontSize: 10.5, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
          {shown.map((f) => (
            <span key={f} style={{ color: MODEL_COLOR[f] }}>
              {compactLegend ? MODEL_NAME[f][0] : MODEL_NAME[f]} {share[f]}%
            </span>
          ))}
        </span>
      </div>
      <div style={{ display: "flex", gap: 2, height: 6 }}>
        {shown.map((f) => (
          <span key={f} style={{ flex: `${share[f]} 0 0`, minWidth: 3, borderRadius: 3, background: MODEL_COLOR[f] }} />
        ))}
      </div>
    </div>
  );
}

function WorkView({ size }: { size: WidgetSize }) {
  const s = useMemo(() => summarize(DATA), []);
  if (size === "small") {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <Stat big value={`${Math.round(s.leverage)}×`} label="actions per prompt I write" />
        <RoutingBar share={s.modelShare} compactLegend />
      </div>
    );
  }
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr 1fr", gap: 10 }}>
        <Stat value={`${Math.round(s.leverage)}×`} label="actions per prompt" />
        <Stat value={compact(s.subagents)} label="sub-agents run" />
        <Stat value={`${s.cacheShare}%`} label="context from cache" />
      </div>
      <RoutingBar share={s.modelShare} />
    </div>
  );
}

/* ── Activity ─────────────────────────────────────────────────────── */

// Days on record (first logged day → last export), so a chart never
// opens with a run of empty bars from before the logs began.
const DAYS_ON_RECORD = DATA.days.length
  ? Math.round((Date.parse(`${DATA.updated}T00:00:00Z`) - Date.parse(`${DATA.days[0].date}T00:00:00Z`)) / 86_400_000) + 1
  : 0;

function ActivityView({ days: wanted, showHeader = true }: { days: number; showHeader?: boolean }) {
  const days = Math.max(1, Math.min(wanted, DAYS_ON_RECORD));
  const series = useMemo(() => recentActions(DATA, days), [days]);
  const total = series.reduce((n, d) => n + d.actions, 0);
  const max = Math.max(1, ...series.map((d) => d.actions));
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
      {showHeader && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 5, whiteSpace: "nowrap", overflow: "hidden" }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{compact(total)}</span>
          <span style={{ fontSize: 11.5, color: LABEL, overflow: "hidden", textOverflow: "ellipsis" }}>
            agent actions · last {days} days
          </span>
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "flex-end", gap: days > 14 ? 3 : 4 }}>
        {series.map((d) => {
          const label = `${dateFmt.format(asDate(d.date))}: ${d.actions.toLocaleString("en-US")} actions`;
          return (
            <div key={d.date} title={label} style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                <div
                  style={{
                    width: "100%",
                    height: d.actions ? `${Math.max(6, (d.actions / max) * 100)}%` : 2,
                    borderRadius: 3,
                    background: d.actions ? `linear-gradient(180deg, ${CLAUDE} 0%, #b85f43 100%)` : "rgba(255, 255, 255, 0.1)",
                  }}
                />
              </div>
              {days <= 14 && (
                <span style={{ fontSize: 9, lineHeight: 1, color: "rgba(255, 255, 255, 0.4)" }}>{weekdayFmt.format(asDate(d.date))}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Widget ───────────────────────────────────────────────────────── */

export default function ClaudeWidget({ size }: { size: WidgetSize }) {
  const [view, setView] = useState<View>("work");
  const reduceMotion = useReducedMotion();
  const lgRef = useLiquidGlass<HTMLDivElement>({ radius: WIDGET_RADIUS, bezel: 14, strength: 0.6, blur: 5, brightness: 0.88, tint: 0.18 });

  const stacked = size === "large";
  const reserveRight = stacked ? 0 : TOGGLE_RIGHT + TOGGLE_WIDTH + 6 - PADDING;
  const updated = dateFmt.format(asDate(DATA.updated));

  const swap = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : {
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
      title={`From my Claude Code logs, updated ${updated}`}
      style={{
        width: "100%",
        height: "100%",
        padding: PADDING,
        borderRadius: WIDGET_RADIUS,
        boxSizing: "border-box",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        cursor: "default",
      }}
    >
      <WidgetHeader icon={<ClaudeMark />} name="Claude Code" suffix={stacked ? ` · updated ${updated}` : null} reserveRight={reserveRight} />
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {stacked ? (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ flex: "none", height: 104 }}>
              <WorkView size="medium" />
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ActivityView days={28} />
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <motion.div key={view} {...swap} style={{ position: "absolute", inset: 0 }}>
              {view === "work" ? <WorkView size={size} /> : <ActivityView days={14} showHeader={size !== "small"} />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
      {!stacked && (
        <WidgetViewToggle
          value={view}
          onChange={setView}
          options={[
            { id: "work", label: "How I work with Claude", icon: <SparkGlyph /> },
            { id: "activity", label: "Daily activity", icon: <ChartGlyph /> },
          ]}
          style={{ top: TOGGLE_TOP, right: TOGGLE_RIGHT }}
        />
      )}
    </motion.div>
  );
}
