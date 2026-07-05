"use client";

import { motion } from "framer-motion";
import { WIDGET_RADIUS } from "@/lib/widgetGrid";
import type { WidgetSize } from "@/lib/widgetLayoutSchema";

/* macOS "Maps" / "Find My" widget — a full-bleed Google Maps embed
   with a minimal location pill overlay at the bottom-left, following
   Apple's real Maps widget design. The card is non-interactive: the
   iframe has pointerEvents none so widget drags work during edit mode,
   and the map itself is display-only (not a clickable interactive map).

   All 3 size tiers show the same region (Rajahmundry, Andhra Pradesh)
   with the same source map. The location pill adapts its text per tier:
   small shows just the city; medium/large show city + state/country. */

// Same entrance spring the other widget cards use (NowPlayingWidget)
// — one shared motion signature across the family.
const ENTRANCE_SPRING = { type: "spring", stiffness: 520, damping: 44, mass: 0.85, restDelta: 0.01 } as const;

export default function LocationWidget({ size }: { size: WidgetSize }) {
  const isSmall = size === "small";

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
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.28)",
      }}
    >
      {/* Full-bleed Google Maps embed — pointerEvents none prevents
          the map from intercepting drag/resize gestures on the widget
          frame, keeping the selection & edit experience intact. */}
      <iframe
        src="https://maps.google.com/maps?q=Rajahmundry,+Andhra+Pradesh,+India&z=12&output=embed"
        width="100%"
        height="100%"
        style={{
          border: 0,
          display: "block",
          pointerEvents: "none",
        }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Map of Rajahmundry"
      />

      {/* Soft top-light bloom — matches the highlight used on other
          glass widgets. Subtle inset gradient at the top edge. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "30%",
          background: "linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent)",
          pointerEvents: "none",
        }}
      />

      {/* Location pill at bottom-left: a small Liquid Glass container
          with a location glyph and text. */}
      <div
        style={{
          position: "absolute",
          bottom: "12px",
          left: "12px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 10px",
          borderRadius: "12px",
          background: "var(--glass-regular-bg)",
          border: "1px solid var(--glass-border)",
          backdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
          WebkitBackdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
          zIndex: 1,
        }}
      >
        {/* Location pin icon — simple SVG, ~12px filled pin. */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ flexShrink: 0, color: "var(--text-primary)" }}
          aria-hidden
        >
          <path
            d="M6 0.5C3.51472 0.5 1.5 2.51472 1.5 5C1.5 8 6 11.5 6 11.5C6 11.5 10.5 8 10.5 5C10.5 2.51472 8.48528 0.5 6 0.5ZM6 6.5C5.17157 6.5 4.5 5.82843 4.5 5C4.5 4.17157 5.17157 3.5 6 3.5C6.82843 3.5 7.5 4.17157 7.5 5C7.5 5.82843 6.82843 6.5 6 6.5Z"
            fill="currentColor"
          />
        </svg>

        {/* Location text — city only on small, city + state/country on
            medium/large. Tight line-height, single line. */}
        {isSmall ? (
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              lineHeight: 1,
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
            }}
          >
            Rajahmundry
          </span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                lineHeight: 1,
                color: "var(--text-primary)",
              }}
            >
              Rajahmundry
            </div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 400,
                lineHeight: 1,
                color: "var(--text-muted)",
              }}
            >
              Andhra Pradesh, India
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
