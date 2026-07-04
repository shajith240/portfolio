// components/widgets/WidgetCanvas.tsx
"use client";

import { useState, useCallback } from "react";
import { useWidgetLayout } from "@/contexts/WidgetLayoutContext";
import { TOP_BOUND, BOTTOM_RESERVE } from "@/contexts/WindowManagerContext";
import { getSizeDimensions } from "@/lib/widgetSizeTiers";
import { WIDGET_RADIUS } from "@/lib/widgetGrid";
import type { Rect } from "@/lib/widgetPositioning";
import type { WidgetId } from "@/lib/widgetLayoutSchema";
import WidgetFrame from "@/components/widgets/WidgetFrame";
import PhotoWidget from "@/components/widgets/PhotoWidget";
import NowPlayingWidget from "@/components/widgets/NowPlayingWidget";
import AIToolsWidget from "@/components/widgets/AIToolsWidget";
import ClockWidget from "@/components/widgets/ClockWidget";
import MotivationWidget from "@/components/widgets/MotivationWidget";

const WIDGET_IDS: WidgetId[] = ["photo", "nowPlaying", "aiTools", "clock", "motivation"];

// Zero-width/zero-height sentinel rects representing the four
// viewport edges a widget can also snap against. computeAlignmentSnap
// already compares a rect's left/center/right (or top/center/bottom)
// against another rect's same three lines; a zero-size rect collapses
// those three lines to one coordinate, which is exactly "this one
// edge is a snap target." Top/bottom use TOP_BOUND/BOTTOM_RESERVE
// (the MenuBar/Dock clearance lines) rather than raw 0/viewportHeight,
// since those are the actual usable-desktop edges widgets are
// constrained to.
function viewportEdgeRects(viewportWidth: number, viewportHeight: number): Rect[] {
  return [
    { x: 0, y: 0, width: 0, height: viewportHeight }, // left edge
    { x: viewportWidth, y: 0, width: 0, height: viewportHeight }, // right edge
    { x: 0, y: TOP_BOUND, width: viewportWidth, height: 0 }, // top edge (below MenuBar)
    { x: 0, y: viewportHeight - BOTTOM_RESERVE, width: viewportWidth, height: 0 }, // bottom edge (above Dock)
  ];
}

export default function WidgetCanvas() {
  const { layout, isEditing, exitEditMode, resetLayout } = useWidgetLayout();
  // Real macOS drag feedback: a white widget-shaped outline at the
  // suggested landing position ("a white widget-shaped outline
  // appears where macOS suggests you place it" — Sonoma's actual
  // documented behavior), not guide lines. null = dragging far from
  // any alignment, no outline.
  const [snapPreview, setSnapPreview] = useState<Rect | null>(null);

  const rectFor = useCallback(
    (id: WidgetId): Rect => {
      const entry = layout[id];
      const dims = getSizeDimensions(id, entry.size);
      return { x: entry.x, y: entry.y, width: dims.width, height: dims.height ?? 0 };
    },
    [layout]
  );

  // Computed once per render (not once per widget inside the map
  // below) — window dimensions don't change mid-render, and this
  // component only ever renders after WidgetLayoutProvider's mount
  // effect has populated layout, so window is always available here.
  const edgeRects = viewportEdgeRects(window.innerWidth, window.innerHeight);

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
        const otherRects = [...WIDGET_IDS.filter((other) => other !== id).map(rectFor), ...edgeRects];
        return (
          <div key={id} onClick={(e) => e.stopPropagation()} style={{ pointerEvents: "auto" }}>
            <WidgetFrame id={id} otherRects={otherRects} onSnapPreview={setSnapPreview}>
              {(size) => {
                if (id === "photo") return <PhotoWidget size={size} />;
                if (id === "nowPlaying") return <NowPlayingWidget size={size} />;
                if (id === "aiTools") return <AIToolsWidget size={size} />;
                if (id === "clock") return <ClockWidget size={size} />;
                return <MotivationWidget size={size as "medium" | "large"} />;
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
            // above the other resting widgets (30).
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
            top: "16px",
            right: "50%",
            transform: "translateX(50%)",
            zIndex: 40,
            padding: "8px 16px",
            borderRadius: "20px",
            background: "var(--glass-regular-bg)",
            border: "1px solid var(--glass-border)",
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
