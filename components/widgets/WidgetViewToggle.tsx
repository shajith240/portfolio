"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/* Compact two-segment glass switch for widgets with two views
   (LeetCode, Codeforces). Icon-only, sits in the widget's top-right
   corner.

   Pointer isolation: WidgetFrame starts its long-press timer from a
   React onPointerDown, and Framer Motion's edit-mode drag listens for
   a NATIVE pointerdown on the frame element. A React stopPropagation
   can't stop the latter (React dispatches from the root, after the
   native event has already passed the frame), so the toggle stops
   pointerdown natively on itself: neither the long-press nor the drag
   ever sees a press that starts on the switch. Clicks are stopped too,
   so the widget body's "open profile" click doesn't fire. */

export interface ToggleOption<T extends string> {
  id: T;
  label: string; // aria-label
  icon: ReactNode;
}

const SEGMENT_W = 24;
const SEGMENT_H = 16;
const PAD = 2;
// Same as motion.md's indicatorSlide preset.
const INDICATOR_SLIDE = { type: "spring", stiffness: 350, damping: 30, mass: 0.8 } as const;

export const TOGGLE_HEIGHT = SEGMENT_H + PAD * 2; // 20
export const TOGGLE_WIDTH = SEGMENT_W * 2 + PAD * 2; // 52

export default function WidgetViewToggle<T extends string>({
  value,
  options,
  onChange,
  style,
}: {
  value: T;
  options: [ToggleOption<T>, ToggleOption<T>];
  onChange: (id: T) => void;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const index = Math.max(0, options.findIndex((o) => o.id === value));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = (e: Event) => e.stopPropagation();
    el.addEventListener("pointerdown", stop);
    return () => el.removeEventListener("pointerdown", stop);
  }, []);

  return (
    <div
      ref={ref}
      role="group"
      aria-label="Widget view"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        display: "flex",
        padding: PAD,
        borderRadius: TOGGLE_HEIGHT / 2,
        // A thin lighter layer of the same glass: a wash plus a hairline
        // keyline, the way Apple draws a segmented control on a
        // material.
        background: "rgba(255, 255, 255, 0.08)",
        boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.14)",
        zIndex: 3,
        cursor: "default",
        ...style,
      }}
    >
      <motion.span
        aria-hidden
        initial={false}
        animate={{ x: index * SEGMENT_W }}
        transition={reduceMotion ? { duration: 0 } : INDICATOR_SLIDE}
        style={{
          position: "absolute",
          left: PAD,
          top: PAD,
          width: SEGMENT_W,
          height: SEGMENT_H,
          borderRadius: SEGMENT_H / 2,
          background: "rgba(255, 255, 255, 0.2)",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.18)",
        }}
      />
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-label={o.label}
            aria-pressed={active}
            onClick={(e) => {
              e.stopPropagation();
              onChange(o.id);
            }}
            style={{
              position: "relative",
              width: SEGMENT_W,
              height: SEGMENT_H,
              display: "grid",
              placeItems: "center",
              padding: 0,
              border: "none",
              borderRadius: SEGMENT_H / 2,
              background: "transparent",
              color: active ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.5)",
              cursor: "pointer",
              transition: "color 0.18s ease",
            }}
          >
            {o.icon}
          </button>
        );
      })}
    </div>
  );
}

/* Glyphs (10px, currentColor). */

export function RingGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
      <path
        d="M2.17 7.83A4 4 0 1 1 7.83 7.83"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function GridGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden fill="currentColor">
      {[0, 3.6, 7.2].flatMap((x) =>
        [0, 3.6, 7.2].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width="2.8" height="2.8" rx="0.7" />)
      )}
    </svg>
  );
}

export function ChartGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
      <path
        d="M0.8 8 L3.4 4.6 L5.8 6.2 L9.2 1.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Brand header — a mirror of GitHubHeatmapWidget's "GitHub" row: a
   12px logo mark in its real brand colours and the name at 10px
   semibold in 55% white, 5px apart, 8px above the content. Sits at the
   top-left of the content box; the toggle shares its line on the
   right (TOGGLE_TOP centres the 20px switch on this 12px row inside
   the widget's 14px padding), so `reserveRight` keeps text clear of
   it. */

export const HEADER_HEIGHT = 12;
export const HEADER_GAP = 8;
export const TOGGLE_TOP = 10;
export const TOGGLE_RIGHT = 10;

export function WidgetHeader({
  icon,
  name,
  suffix,
  showName = true,
  reserveRight = 0,
}: {
  icon: ReactNode; // brand mark, ~12px tall
  name: string;
  suffix?: string | null;
  showName?: boolean;
  reserveRight?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
        height: HEADER_HEIGHT,
        marginBottom: HEADER_GAP,
        paddingRight: reserveRight,
        flex: "none",
        minWidth: 0,
      }}
    >
      {icon}
      {showName && (
        <span
          style={{
            fontSize: "10px",
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.55)",
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
          }}
        >
          {name}
          {suffix}
        </span>
      )}
    </div>
  );
}

/* Brand marks, in their real colours on a dark surface. */

// LeetCode's own mark (from leetcode.com, paths verbatim): orange
// curve, grey bar, and the bracket in white as LeetCode draws it in
// dark mode. Drawn 13px tall — its narrow 95×111 box reads small at
// 12px next to the other square marks.
export function LeetCodeMark() {
  return (
    <svg height="13" viewBox="0 0 95 111" aria-hidden style={{ flex: "none", width: "auto" }} fill="none">
      <path
        d="M68.0063 83.0664C70.5 80.5764 74.5366 80.5829 77.0223 83.0809C79.508 85.579 79.5015 89.6226 77.0078 92.1127L65.9346 103.17C55.7187 113.371 39.06 113.519 28.6718 103.513C28.6117 103.456 23.9861 98.9201 8.72653 83.957C-1.42528 74.0029 -2.43665 58.0749 7.11648 47.8464L24.9282 28.7745C34.4095 18.6219 51.887 17.5122 62.7275 26.2789L78.9048 39.362C81.6444 41.5776 82.0723 45.5985 79.8606 48.3429C77.6488 51.0873 73.635 51.5159 70.8954 49.3003L54.7182 36.2173C49.0488 31.6325 39.1314 32.2622 34.2394 37.5006L16.4274 56.5727C11.7767 61.5522 12.2861 69.574 17.6456 74.8292C28.851 85.8169 37.4869 94.2846 37.4969 94.2942C42.8977 99.496 51.6304 99.4184 56.9331 94.1234L68.0063 83.0664Z"
        fill="#FFA116"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M41.1067 72.0014C37.5858 72.0014 34.7314 69.1421 34.7314 65.615C34.7314 62.0879 37.5858 59.2286 41.1067 59.2286H88.1245C91.6454 59.2286 94.4997 62.0879 94.4997 65.615C94.4997 69.1421 91.6454 72.0014 88.1245 72.0014H41.1067Z"
        fill="#B3B3B3"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M49.9118 2.02335C52.3173 -0.55232 56.3517 -0.686894 58.9228 1.72277C61.494 4.13244 61.6284 8.17385 59.2229 10.7495L16.4276 56.5729C11.7768 61.552 12.2861 69.5738 17.6453 74.8292L37.4088 94.2091C39.9249 96.6764 39.968 100.72 37.505 103.24C35.042 105.761 31.0056 105.804 28.4895 103.337L8.72593 83.9567C-1.42529 74.0021 -2.43665 58.0741 7.1169 47.8463L49.9118 2.02335Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

// simple-icons' siCodeforces path is three bars in one path; split on
// its subpaths (relative `m` moves rewritten as absolute) so each bar
// takes the official favicon colour, left to right.
const CF_BARS = [
  { d: "M4.5 7.5C5.328 7.5 6 8.172 6 9v10.5c0 .828-.672 1.5-1.5 1.5h-3C.673 21 0 20.328 0 19.5V9c0-.828.673-1.5 1.5-1.5h3z", fill: "#F9CE56" },
  { d: "M13.5 3c.828 0 1.5.672 1.5 1.5v15c0 .828-.672 1.5-1.5 1.5h-3c-.827 0-1.5-.672-1.5-1.5v-15c0-.828.673-1.5 1.5-1.5h3z", fill: "#188CCC" },
  { d: "M22.5 10.5c.828 0 1.5.672 1.5 1.5v7.5c0 .828-.672 1.5-1.5 1.5h-3c-.828 0-1.5-.672-1.5-1.5V12c0-.828.672-1.5 1.5-1.5h3z", fill: "#BA1D25" },
];

export function CodeforcesMark() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden style={{ flex: "none" }}>
      {CF_BARS.map((b) => (
        <path key={b.fill} d={b.d} fill={b.fill} />
      ))}
    </svg>
  );
}

// GitHub's mark is monochrome by design: solid white on dark, as
// github.com draws it in dark mode.
export function GitHubMark() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden style={{ flex: "none" }}>
      <path
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function PinGlyph() {
  // A pushpin: round head, short needle.
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
      <circle cx="5" cy="3.4" r="2.6" fill="currentColor" />
      <path d="M5 5.6V9.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
