"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { WIDGET_RADIUS } from "@/lib/widgetGrid";
import type { WidgetSize } from "@/lib/widgetLayoutSchema";

/* Location + local-time card, in the visual language of Apple's
   World Clock / Find My widgets — replacing the earlier full-bleed
   Google Maps embed. The map was a third-party iframe that loaded
   Google's own UI chrome (buttons, attribution, terms links) into a
   170px card: visually noisy, heavy on the network, and it told the
   visitor nothing beyond a city name. This card communicates the
   same fact (where I am) plus one genuinely useful one: my current
   local time — i.e. whether I'm likely awake when you're reading.

   No Liquid Glass here: like the Photo widget, this is an OPAQUE
   card (Apple's own colored widgets — Weather, Clock — are solid
   surfaces, not glass). Deep night-blue gradient from the same
   family Apple uses for its dark map/clock faces. */

const ENTRANCE_SPRING = { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 } as const;

const CARD_BG = "linear-gradient(165deg, #1c3a6a 0%, #122647 55%, #0b1730 100%)";

const TIME_ZONE = "Asia/Kolkata";

function formatLocalTime(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIME_ZONE,
  });
}

// Self-scheduling minute tick: fires exactly on the minute boundary
// instead of polling on an interval — one state update per displayed
// change, zero wasted re-renders between them. Starts empty ("" on
// the server render) and fills in the mount effect, the codebase's
// established hydration-safe clock pattern (MenuBar's Clock).
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

const PinGlyph = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden style={{ flexShrink: 0 }}>
    <path
      d="M6 0.5C3.51472 0.5 1.5 2.51472 1.5 5C1.5 8 6 11.5 6 11.5C6 11.5 10.5 8 10.5 5C10.5 2.51472 8.48528 0.5 6 0.5ZM6 6.5C5.17157 6.5 4.5 5.82843 4.5 5C4.5 4.17157 5.17157 3.5 6 3.5C6.82843 3.5 7.5 4.17157 7.5 5C7.5 5.82843 6.82843 6.5 6 6.5Z"
      fill="currentColor"
    />
  </svg>
);

export default function LocationWidget({ size }: { size: WidgetSize }) {
  const isSmall = size === "small";
  const time = useLocalTime();

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={ENTRANCE_SPRING}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: `${WIDGET_RADIUS}px`,
        overflow: "hidden",
        boxSizing: "border-box",
        position: "relative",
        background: CARD_BG,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.28)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: isSmall ? "16px" : "18px 20px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Same soft top-light bloom the other opaque widgets carry. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "34%",
          background: "linear-gradient(180deg, rgba(255, 255, 255, 0.09), transparent)",
          pointerEvents: "none",
        }}
      />

      {/* City (+ region on medium/large) */}
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "rgba(255,255,255,0.95)" }}>
          <PinGlyph size={isSmall ? 11 : 12} />
          <span
            style={{
              fontSize: isSmall ? "13px" : "15px",
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
            }}
          >
            Rajahmundry
          </span>
        </div>
        {!isSmall && (
          <div style={{ marginTop: "3px", fontSize: "12px", fontWeight: 400, color: "rgba(255,255,255,0.55)" }}>
            Andhra Pradesh, India
          </div>
        )}
      </div>

      {/* Local time — the widget's payload. Tabular numerals so the
          minute flip doesn't shift layout. */}
      <div style={{ position: "relative" }}>
        <div
          style={{
            fontSize: isSmall ? "30px" : "38px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            color: "#ffffff",
            fontVariantNumeric: "tabular-nums",
            // Reserve the line so the card doesn't jump when the
            // hydration-safe empty initial fills in.
            minHeight: isSmall ? "30px" : "38px",
          }}
        >
          {time}
        </div>
        <div
          style={{
            marginTop: "5px",
            fontSize: isSmall ? "10px" : "11px",
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          {isSmall ? "My local time" : "My local time · GMT+5:30"}
        </div>
      </div>
    </motion.div>
  );
}
