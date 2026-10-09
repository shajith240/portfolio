"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { WIDGET_RADIUS } from "@/lib/widgetGrid";
import type { WidgetSize } from "@/lib/widgetLayoutSchema";
import { RAJAHMUNDRY_MAP as MAP } from "@/lib/mapData/rajahmundry";
import { LOCATION } from "@/data/profile";
import { openExternal } from "@/lib/externalLink";

/* Location widget — a real, full-bleed dark map of Rajahmundry with
   a location dot on it, in the language of Apple's Maps widget: the
   map IS the widget, the dot sits on the place,
   and the name and local time rest on a soft scrim along the bottom.

   The map is baked vector data (scripts/bake-map.mjs →
   lib/mapData/rajahmundry.ts, © OpenStreetMap contributors, ODbL), so
   there's no tile server, API key or network request — and every
   shoreline and road is styled here, in a muted Apple-dark palette.
   Apple doesn't publish its Maps colours; these are tuned by eye to
   that family (deep blue-teal water, near-black land, roads that
   brighten with importance), not sampled values.

   The marker is Maps' own "you are here" dot. Opaque like Apple's own Maps widget (no Liquid Glass
   over a map). */

const ENTRANCE_SPRING = { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 } as const;
const MAPS_URL = "https://maps.apple.com/?ll=17.0050,81.7805&q=Rajahmundry&z=13";

// Map palette (dark).
const LAND = "#1a1d22";
const WATER = "#173a55";
const WATER_EDGE = "rgba(120, 180, 225, 0.18)";
const PARK = "#1d2a23";
const ROAD = {
  minor: { color: "#2a2e35", width: 0.55 },
  tertiary: { color: "#363b43", width: 0.9 },
  secondary: { color: "#474c55", width: 1.25 },
  primary: { color: "#646872", width: 1.8 },
};

// How much of the city each size shows (km across) and where the
// marker sits vertically (fraction of height) — high enough to clear
// the text scrim.
const FRAMING: Record<WidgetSize, { km: number; pinY: number }> = {
  small: { km: 2.4, pinY: 0.4 },
  medium: { km: 3.6, pinY: 0.42 },
  large: { km: 3.4, pinY: 0.44 },
};

const TIME_ZONE = LOCATION.timeZone;

function formatLocalTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: TIME_ZONE });
}

// Self-scheduling minute tick: one update exactly on each minute
// boundary. Empty on the server render, filled in on mount.
function useLocalTime(): string {
  const [time, setTime] = useState("");
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const now = new Date();
      setTime(formatLocalTime(now));
      timer = setTimeout(tick, 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);
  return time;
}

function useBoxSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox((b) => (b.width === width && b.height === height ? b : { width, height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, box] as const;
}

/* Apple Maps' "you are here" dot: a blue core in a white ring with a
   soft shadow, sitting on a translucent accuracy halo that breathes
   slowly. Centred exactly on the point it marks. */
const LOCATION_BLUE = "#0A84FF"; // systemBlue, dark appearance

function LocationPuck({ dot, breathe }: { dot: number; breathe: boolean }) {
  const halo = dot * 3.4;
  const ring = Math.max(2.5, dot * 0.2);
  return (
    <div style={{ position: "relative", width: halo, height: halo }}>
      <motion.div
        aria-hidden
        initial={false}
        animate={breathe ? { scale: [0.82, 1, 0.82], opacity: [0.9, 0.55, 0.9] } : { scale: 1, opacity: 0.75 }}
        transition={breathe ? { duration: 3.2, ease: "easeInOut", repeat: Infinity } : { duration: 0 }}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(10,132,255,0.32) 0%, rgba(10,132,255,0.2) 55%, rgba(10,132,255,0.06) 100%)",
          boxShadow: "inset 0 0 0 1px rgba(10,132,255,0.28)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: dot,
          height: dot,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: `radial-gradient(circle at 50% 35%, #3d9dff 0%, ${LOCATION_BLUE} 70%)`,
          boxShadow: `0 0 0 ${ring}px #ffffff, 0 2px 8px ${ring}px rgba(0,0,0,0.4)`,
        }}
      />
    </div>
  );
}

export default function LocationWidget({ size }: { size: WidgetSize }) {
  const isSmall = size === "small";
  const time = useLocalTime();
  const reduceMotion = useReducedMotion();
  const [boxRef, box] = useBoxSize<HTMLDivElement>();
  const downAt = useRef<{ x: number; y: number } | null>(null);

  // Crop the baked square to this widget's aspect: `km` across, the
  // city centre placed at (50%, pinY).
  const { km, pinY } = FRAMING[size];
  const aspect = box.width && box.height ? box.height / box.width : size === "medium" ? 170 / 354 : 1;
  const vbW = (km * 1000) / MAP.metersPerUnit;
  const vbH = vbW * aspect;
  const vbX = MAP.center[0] - vbW / 2;
  const vbY = MAP.center[1] - vbH * pinY;
  // Map units → screen px, for strokes drawn in screen pixels.
  const pxPerUnit = box.width ? box.width / vbW : 1;

  const dot = isSmall ? 13 : 15;

  const open = (e: React.MouseEvent) => {
    const d = downAt.current;
    if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return;
    openExternal(MAPS_URL);
  };

  return (
    <motion.div
      ref={boxRef}
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={ENTRANCE_SPRING}
      onPointerDown={(e) => (downAt.current = { x: e.clientX, y: e.clientY })}
      onClick={open}
      role="link"
      aria-label={`${LOCATION.city}, ${LOCATION.region}. Open in Maps`}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: `${WIDGET_RADIUS}px`,
        overflow: "hidden",
        position: "relative",
        background: LAND,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.28)",
        cursor: "pointer",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* The map */}
      <svg
        aria-hidden
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      >
        <rect x={vbX} y={vbY} width={vbW} height={vbH} fill={LAND} />
        <path d={MAP.parks} fill={PARK} />
        <path d={MAP.water} fill={WATER} fillRule="evenodd" stroke={WATER_EDGE} strokeWidth={0.8 / pxPerUnit} />
        <path d={MAP.rivers} fill="none" stroke={WATER} strokeWidth={2 / pxPerUnit} strokeLinecap="round" />
        {(["minor", "tertiary", "secondary", "primary"] as const).map((k) => (
          <path
            key={k}
            d={MAP.roads[k]}
            fill="none"
            stroke={ROAD[k].color}
            strokeWidth={ROAD[k].width / pxPerUnit}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        <path d={MAP.rail} fill="none" stroke="#3b4048" strokeWidth={0.9 / pxPerUnit} strokeDasharray={`${3 / pxPerUnit} ${2.5 / pxPerUnit}`} />
      </svg>

      {/* Gentle vignette so the edges recede and the marker holds focus. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(120% 95% at 50% 42%, transparent 55%, rgba(0,0,0,0.35) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Location dot, centred on the city centre. */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: `${pinY * 100}%`,
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      >
        <LocationPuck dot={dot} breathe={!reduceMotion} />
      </div>

      {/* Name + local time on a soft scrim. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: isSmall ? "28px 14px 12px" : "34px 16px 13px",
          background: "linear-gradient(180deg, rgba(10,12,16,0) 0%, rgba(10,12,16,0.72) 55%, rgba(10,12,16,0.86) 100%)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 10,
          pointerEvents: "none",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: isSmall ? 14 : 15,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: "#ffffff",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
            }}
          >
            {LOCATION.city}
          </div>
          <div
            style={{
              marginTop: 2,
              fontSize: 11.5,
              color: "rgba(255,255,255,0.6)",
              whiteSpace: "nowrap",
              fontVariantNumeric: "tabular-nums",
              minHeight: 14,
            }}
          >
            {isSmall ? time : LOCATION.region}
          </div>
        </div>
        {!isSmall && (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: "-0.015em",
                color: "#ffffff",
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
                minHeight: 22,
              }}
            >
              {time}
            </div>
            <div style={{ marginTop: 2, fontSize: 10.5, color: "rgba(255,255,255,0.55)", letterSpacing: "0.02em" }}>
              Local time · GMT+5:30
            </div>
          </div>
        )}
      </div>

      {/* Required ODbL attribution — quiet, but always visible. */}
      <div
        style={{
          position: "absolute",
          top: 7,
          right: 9,
          fontSize: 8.5,
          color: "rgba(255,255,255,0.38)",
          letterSpacing: "0.01em",
          pointerEvents: "none",
        }}
      >
        © OpenStreetMap
      </div>
    </motion.div>
  );
}
