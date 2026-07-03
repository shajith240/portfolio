// components/widgets/WidgetFrame.tsx
"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import { motion, useReducedMotion, type PanInfo } from "framer-motion";
import { useWidgetLayout } from "@/contexts/WidgetLayoutContext";
import { useLongPress } from "@/lib/useLongPress";
import { computeAlignmentSnap, snapToGrid, type Rect, type AlignmentGuide } from "@/lib/widgetPositioning";
import { getSizeDimensions, nearestSizeTier, WIDGET_SIZE_TIERS } from "@/lib/widgetSizeTiers";
import type { WidgetId, WidgetSize } from "@/lib/widgetLayoutSchema";

// New preset for this feature — see docs/design-system/motion.md's
// existing vocabulary; close to `tapPress` (400/17) but more damped,
// since a widget locking into a grid position should feel firm and
// precise, not bouncy.
const WIDGET_SNAP_SPRING = { type: "spring", stiffness: 400, damping: 32 } as const;
const EXIT_JIGGLE_SPRING = { type: "spring", stiffness: 400, damping: 17 } as const;

interface WidgetFrameProps {
  id: WidgetId;
  otherRects: Rect[]; // every other widget's current on-screen rect, for alignment-guide comparison
  onGuidesChange: (guides: AlignmentGuide[]) => void;
  children: (size: WidgetSize) => React.ReactNode;
}

export default function WidgetFrame({ id, otherRects, onGuidesChange, children }: WidgetFrameProps) {
  const { layout, isEditing, enterEditMode, updatePosition, updateSize } = useWidgetLayout();
  const prefersReducedMotion = useReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);
  const [liveSize, setLiveSize] = useState<{ width: number; height: number } | null>(null);
  const resizingRef = useRef(false);

  const entry = layout[id];
  const dims = getSizeDimensions(id, entry.size);
  const width = liveSize?.width ?? dims.width;
  const height = liveSize?.height ?? dims.height;

  const longPress = useLongPress(enterEditMode);

  // Jiggle: each widget's own cycle duration (0.13s-0.19s band,
  // deterministic per id rather than Math.random() so server/client
  // never disagree) — the slight per-widget desync is what keeps a
  // multi-widget jiggle from looking robotic, matching real iOS.
  const jiggleDuration = useMemo(() => {
    const seed = id.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return 0.13 + (seed % 7) * 0.01; // 0.13 - 0.19
  }, [id]);

  // entry.x/entry.y is the widget's current committed position (the
  // same value driving the `animate` x/y below); info.offset is the
  // drag's cumulative delta since it started — adding them gives the
  // widget's live on-screen corner position, never the raw pointer
  // coordinate.
  const handleDrag = useCallback(
    (_: unknown, info: PanInfo) => {
      const liveX = entry.x + info.offset.x;
      const liveY = entry.y + info.offset.y;
      const rect: Rect = { x: liveX, y: liveY, width, height: height ?? 0 };
      const snap = computeAlignmentSnap(rect, otherRects);
      onGuidesChange(snap.guides);
    },
    [entry.x, entry.y, width, height, otherRects, onGuidesChange]
  );

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const liveX = entry.x + info.offset.x;
      const liveY = entry.y + info.offset.y;
      const rect: Rect = { x: liveX, y: liveY, width, height: height ?? 0 };
      const snap = computeAlignmentSnap(rect, otherRects);
      const finalX = snap.guides.some((g) => g.axis === "x") ? snap.x : snapToGrid(snap.x);
      const finalY = snap.guides.some((g) => g.axis === "y") ? snap.y : snapToGrid(snap.y);
      onGuidesChange([]);
      updatePosition(id, finalX, finalY);
    },
    [entry.x, entry.y, width, height, otherRects, onGuidesChange, updatePosition, id]
  );

  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (!resizingRef.current || !frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    setLiveSize({
      width: Math.max(120, e.clientX - rect.left),
      height: Math.max(80, e.clientY - rect.top),
    });
  }, []);

  const handleResizeEnd = useCallback(() => {
    resizingRef.current = false;
    if (liveSize) {
      const nearest = nearestSizeTier(WIDGET_SIZE_TIERS[id], liveSize.width, liveSize.height);
      updateSize(id, nearest);
    }
    setLiveSize(null);
  }, [id, liveSize, updateSize]);

  return (
    <motion.div
      ref={frameRef}
      drag={isEditing}
      dragMomentum={false}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onPointerDown={longPress.onPointerDown}
      onPointerMove={longPress.onPointerMove}
      onPointerUp={() => longPress.onPointerUp()}
      onPointerLeave={longPress.onPointerLeave}
      onClickCapture={longPress.onClickCapture}
      // Position is driven entirely by x/y here (transform-based),
      // never by CSS left/top — the one and only source of truth for
      // "where this widget is" is WidgetLayoutContext's entry.x/y,
      // read back in on every render. rotate is the jiggle wiggle
      // (or 0 when not editing / reduced-motion).
      animate={{
        x: entry.x,
        y: entry.y,
        rotate: isEditing && !prefersReducedMotion ? [-1.5, 1.5, -1.5] : 0,
      }}
      transition={{
        x: prefersReducedMotion ? { duration: 0 } : WIDGET_SNAP_SPRING,
        y: prefersReducedMotion ? { duration: 0 } : WIDGET_SNAP_SPRING,
        rotate:
          isEditing && !prefersReducedMotion
            ? { duration: jiggleDuration, repeat: Infinity, ease: "easeInOut" }
            : EXIT_JIGGLE_SPRING,
      }}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width,
        height,
        zIndex: isEditing ? 30 : 20,
        touchAction: isEditing ? "none" : undefined,
      }}
    >
      {children(entry.size)}

      {isEditing && (
        <div
          role="button"
          aria-label={`Resize ${id} widget`}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            resizingRef.current = true;
          }}
          onPointerMove={handleResizeMove}
          onPointerUp={(e) => {
            e.currentTarget.releasePointerCapture(e.pointerId);
            handleResizeEnd();
          }}
          style={{
            position: "absolute",
            right: -6,
            bottom: -6,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "var(--glass-regular-bg)",
            border: "1px solid var(--glass-border)",
            cursor: "nwse-resize",
            touchAction: "none",
          }}
        />
      )}
    </motion.div>
  );
}
