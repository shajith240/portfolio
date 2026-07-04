// components/widgets/WidgetCanvas.tsx
"use client";

import { useState, useCallback } from "react";
import { useWidgetLayout } from "@/contexts/WidgetLayoutContext";
import { getSizeDimensions } from "@/lib/widgetSizeTiers";
import type { AlignmentGuide, Rect } from "@/lib/widgetPositioning";
import type { WidgetId } from "@/lib/widgetLayoutSchema";
import WidgetFrame from "@/components/widgets/WidgetFrame";
import PhotoWidget from "@/components/widgets/PhotoWidget";
import NowPlayingWidget from "@/components/widgets/NowPlayingWidget";
import AIToolsWidget from "@/components/widgets/AIToolsWidget";
import ClockWidget from "@/components/widgets/ClockWidget";
import MotivationWidget from "@/components/widgets/MotivationWidget";

const WIDGET_IDS: WidgetId[] = ["photo", "nowPlaying", "aiTools", "clock", "motivation"];

export default function WidgetCanvas() {
  const { layout, isEditing, exitEditMode, resetLayout } = useWidgetLayout();
  const [guides, setGuides] = useState<AlignmentGuide[]>([]);

  const rectFor = useCallback(
    (id: WidgetId): Rect => {
      const entry = layout[id];
      const dims = getSizeDimensions(id, entry.size);
      return { x: entry.x, y: entry.y, width: dims.width, height: dims.height ?? 0 };
    },
    [layout]
  );

  return (
    <div
      // Tapping empty canvas space (not a widget — widgets stop this
      // click via WidgetFrame's own onClick handling) exits edit mode.
      onClick={() => isEditing && exitEditMode()}
      style={{ position: "fixed", inset: 0, zIndex: 20, pointerEvents: isEditing ? "auto" : "none" }}
    >
      {WIDGET_IDS.map((id) => {
        const otherRects = WIDGET_IDS.filter((other) => other !== id).map(rectFor);
        return (
          <div key={id} style={{ pointerEvents: "auto" }}>
            <WidgetFrame id={id} otherRects={otherRects} onGuidesChange={setGuides}>
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

      {guides.map((guide, i) => (
        <div
          key={i}
          aria-hidden
          style={{
            position: "fixed",
            background: "var(--color-accent)",
            pointerEvents: "none",
            zIndex: 40,
            ...(guide.axis === "x"
              ? { left: guide.position, top: 0, width: "1px", height: "100vh" }
              : { top: guide.position, left: 0, height: "1px", width: "100vw" }),
          }}
        />
      ))}

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
