// components/widgets/WidgetCanvas.tsx
"use client";

import { useState, useCallback } from "react";
import { useWidgetLayout } from "@/contexts/WidgetLayoutContext";
import { spanForSize, type Occupancy, type Rect } from "@/lib/widgetPositioning";
import { WIDGET_RADIUS } from "@/lib/widgetGrid";
import type { WidgetId } from "@/lib/widgetLayoutSchema";
import WidgetFrame from "@/components/widgets/WidgetFrame";
import PhotoWidget from "@/components/widgets/PhotoWidget";
import NowPlayingWidget from "@/components/widgets/NowPlayingWidget";
import GitHubHeatmapWidget from "@/components/widgets/GitHubHeatmapWidget";
// Keep widget id as "aiTools" to maintain stored layouts; render the new widget for it
import LocationWidget from "@/components/widgets/LocationWidget";
import MotivationWidget from "@/components/widgets/MotivationWidget";

const WIDGET_IDS: WidgetId[] = ["photo", "nowPlaying", "aiTools", "location", "motivation"];

export default function WidgetCanvas() {
  const { layout, isEditing, exitEditMode, resetLayout } = useWidgetLayout();
  // The white widget-shaped outline at the lattice cell the dragged
  // widget will land on — macOS's own drag feedback. Because drops
  // are cell-resolved, the outline is always a legal position.
  const [snapPreview, setSnapPreview] = useState<Rect | null>(null);

  const occupancyFor = useCallback(
    (id: WidgetId): Occupancy => {
      const entry = layout[id];
      return { cell: { col: entry.col, row: entry.row }, span: spanForSize(entry.size) };
    },
    [layout]
  );

  return (
    <div
      // Tapping empty canvas space (not a widget) exits edit mode. The
      // per-widget wrapper below stops propagation on its own onClick
      // so this handler only ever fires for clicks that land on bare
      // canvas — without that stop, an ordinary click on a widget
      // (not a drag, which never emits a trailing click) would bubble
      // up here and exit edit mode immediately, making it impossible
      // to interact with a jiggling widget at all.
      onClick={() => isEditing && exitEditMode()}
      style={{ position: "fixed", inset: 0, zIndex: 20, pointerEvents: isEditing ? "auto" : "none" }}
    >
      {WIDGET_IDS.map((id) => {
        const others = WIDGET_IDS.filter((other) => other !== id).map(occupancyFor);
        return (
          <div key={id} onClick={(e) => e.stopPropagation()} style={{ pointerEvents: "auto" }}>
            <WidgetFrame id={id} others={others} onSnapPreview={setSnapPreview}>
              {(size) => {
                if (id === "photo") return <PhotoWidget size={size} />;
                if (id === "nowPlaying") return <NowPlayingWidget size={size} />;
                if (id === "aiTools") return <GitHubHeatmapWidget size={size} />;
                if (id === "location") return <LocationWidget size={size} />;
                return <MotivationWidget size={size} />;
              }}
            </WidgetFrame>
          </div>
        );
      })}

      {snapPreview && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            left: snapPreview.x,
            top: snapPreview.y,
            width: snapPreview.width,
            height: snapPreview.height,
            borderRadius: `${WIDGET_RADIUS}px`,
            border: "2px solid rgba(255, 255, 255, 0.85)",
            background: "rgba(255, 255, 255, 0.06)",
            pointerEvents: "none",
            // Below the dragged widget (zIndex 40 while dragging) so
            // the outline reads as the destination underneath it, but
            // above the other resting widgets.
            zIndex: 35,
          }}
        />
      )}

      {isEditing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            resetLayout();
          }}
          style={{
            position: "fixed",
            // Below the 24px menu bar (was 16px, which overlapped it).
            top: "38px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 40,
            padding: "8px 18px",
            borderRadius: "20px",
            background: "var(--glass-regular-bg)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid var(--glass-border)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0.5px rgba(255,255,255,0.25)",
            color: "var(--text-primary)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reset Layout
        </button>
      )}
    </div>
  );
}
