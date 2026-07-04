// components/widgets/WidgetFrame.tsx
"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import { motion, useReducedMotion, type PanInfo } from "framer-motion";
import { useWidgetLayout } from "@/contexts/WidgetLayoutContext";
import { useLongPress } from "@/lib/useLongPress";
import { computeAlignmentSnap, snapToGrid, type Rect } from "@/lib/widgetPositioning";
import { getSizeDimensions, nearestSizeTier, WIDGET_SIZE_TIERS } from "@/lib/widgetSizeTiers";
import { WIDGET_RADIUS } from "@/lib/widgetGrid";
import type { WidgetId, WidgetSize } from "@/lib/widgetLayoutSchema";

// New preset for this feature — see docs/design-system/motion.md's
// existing vocabulary; close to `tapPress` (400/17) but more damped,
// since a widget locking into a grid position should feel firm and
// precise, not bouncy.
const WIDGET_SNAP_SPRING = { type: "spring", stiffness: 400, damping: 32 } as const;
const EXIT_JIGGLE_SPRING = { type: "spring", stiffness: 400, damping: 17 } as const;

// Jiggle amplitude/tempo tuned to real iOS, not guessed: iOS's icon/
// widget wiggle is a slow ±~1° sway at roughly a 0.3s cycle. The
// first version of this ran ±1.5° at 0.13–0.19s — about twice
// Apple's speed and 50% over its amplitude — which is exactly why it
// read as frantic buzzing instead of a calm wobble.
const JIGGLE_AMPLITUDE = 1;

interface WidgetFrameProps {
  id: WidgetId;
  otherRects: Rect[]; // every other widget's current on-screen rect, for alignment comparison
  // Real macOS drag feedback is a white widget-shaped outline drawn at
  // the suggested landing position — NOT guide lines (that was this
  // component's first, wrong guess). null = no alignment currently
  // active (dropped far from everything, no outline shown), matching
  // macOS's own behavior of only showing the outline near other
  // widgets.
  onSnapPreview: (rect: Rect | null) => void;
  children: (size: WidgetSize) => React.ReactNode;
}

export default function WidgetFrame({ id, otherRects, onSnapPreview, children }: WidgetFrameProps) {
  const { layout, isEditing, enterEditMode, updatePosition, updateSize } = useWidgetLayout();
  const prefersReducedMotion = useReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);
  const [liveSize, setLiveSize] = useState<{ width: number; height: number } | null>(null);
  const resizingRef = useRef(false);
  // Separate from resizingRef (a synchronous guard read inside the
  // pointermove handler, doesn't need to trigger a render): this is
  // what actually turns Framer Motion's own `drag` gesture off the
  // instant the resize handle is pressed. Without it, the parent
  // motion.div's drag gesture stays live the whole time edit mode is
  // on, including while the resize handle is being dragged — two
  // independent gesture systems (Framer's native drag tracking and
  // this file's manual pointer-capture resize tracking) fighting over
  // the same pointer on every move is what froze the page.
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const entry = layout[id];
  const dims = getSizeDimensions(id, entry.size);
  const width = liveSize?.width ?? dims.width;
  const height = liveSize?.height ?? dims.height;

  const longPress = useLongPress(enterEditMode);

  // Each widget gets its own cycle duration in a narrow band around
  // iOS's ~0.3s, plus an alternating start direction — deterministic
  // per id (never Math.random()) so server/client can't disagree.
  // The slight per-widget desync is what keeps a multi-widget jiggle
  // from looking robotic, matching real iOS.
  const { jiggleDuration, jiggleDirection } = useMemo(() => {
    const seed = id.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return {
      jiggleDuration: 0.28 + (seed % 5) * 0.015, // 0.28 – 0.34s
      jiggleDirection: seed % 2 === 0 ? 1 : -1,
    };
  }, [id]);

  // The jiggle pauses (and the widget lifts slightly) while IT is
  // being dragged — real iOS behavior: the picked-up item stops
  // wiggling and scales up while the rest of the screen keeps
  // jiggling. Resize also pauses it so the corner handle isn't
  // chasing a rotating target.
  const jiggling = isEditing && !prefersReducedMotion && !isDragging && !isResizing;

  // Where would this widget land if dropped at (liveX, liveY)?
  // Guide-snapped on any axis where an alignment hit, 8px-grid-snapped
  // otherwise — the identical math for the mid-drag preview outline
  // and the actual drop, so the outline never lies about the landing
  // position. Height uses the frame's real rendered height
  // (offsetHeight — layout box, unaffected by the inner wrapper's
  // rotate/scale transforms), not the tier table's, so content-driven
  // widgets (no fixed height) still get correct vertical alignment.
  const computeDrop = useCallback(
    (liveX: number, liveY: number) => {
      const measuredH = frameRef.current?.offsetHeight ?? height ?? 0;
      const rect: Rect = { x: liveX, y: liveY, width, height: measuredH };
      const snap = computeAlignmentSnap(rect, otherRects);
      const x = snap.guides.some((g) => g.axis === "x") ? snap.x : snapToGrid(snap.x);
      const y = snap.guides.some((g) => g.axis === "y") ? snap.y : snapToGrid(snap.y);
      return { x, y, aligned: snap.guides.length > 0, height: measuredH };
    },
    [width, height, otherRects]
  );

  // entry.x/entry.y is the widget's current committed position (the
  // same value driving the `animate` x/y below); info.offset is the
  // drag's cumulative delta since it started — adding them gives the
  // widget's live on-screen corner position, never the raw pointer
  // coordinate.
  const handleDrag = useCallback(
    (_: unknown, info: PanInfo) => {
      const drop = computeDrop(entry.x + info.offset.x, entry.y + info.offset.y);
      onSnapPreview(drop.aligned ? { x: drop.x, y: drop.y, width, height: drop.height } : null);
    },
    [entry.x, entry.y, width, computeDrop, onSnapPreview]
  );

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const drop = computeDrop(entry.x + info.offset.x, entry.y + info.offset.y);
      onSnapPreview(null);
      setIsDragging(false);
      updatePosition(id, drop.x, drop.y);
    },
    [entry.x, entry.y, computeDrop, onSnapPreview, updatePosition, id]
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
      drag={isEditing && !isResizing}
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onPointerDown={longPress.onPointerDown}
      onPointerMove={longPress.onPointerMove}
      onPointerUp={() => longPress.onPointerUp()}
      onPointerLeave={longPress.onPointerLeave}
      onClickCapture={longPress.onClickCapture}
      // This outer div owns POSITION only (drag + x/y), driven
      // entirely by transform, never CSS left/top — the one and only
      // source of truth for "where this widget is" is
      // WidgetLayoutContext's entry.x/y, read back in on every render.
      // The jiggle rotation deliberately does NOT live here: it's on
      // the inner wrapper below, so the two transforms can never
      // interfere with each other or with drag's own transform math.
      animate={{ x: entry.x, y: entry.y }}
      transition={{
        x: prefersReducedMotion ? { duration: 0 } : WIDGET_SNAP_SPRING,
        y: prefersReducedMotion ? { duration: 0 } : WIDGET_SNAP_SPRING,
      }}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width,
        height,
        zIndex: isDragging ? 40 : isEditing ? 30 : 20,
        touchAction: isEditing ? "none" : undefined,
      }}
    >
      {/* Inner wrapper: jiggle rotation + pick-up lift, isolated from
          the outer div's position transform. */}
      <motion.div
        animate={{
          rotate: jiggling
            ? [JIGGLE_AMPLITUDE * jiggleDirection, -JIGGLE_AMPLITUDE * jiggleDirection, JIGGLE_AMPLITUDE * jiggleDirection]
            : 0,
          scale: isDragging && !prefersReducedMotion ? 1.04 : 1,
        }}
        transition={{
          rotate: jiggling
            ? { duration: jiggleDuration, repeat: Infinity, ease: "easeInOut" }
            : EXIT_JIGGLE_SPRING,
          scale: prefersReducedMotion ? { duration: 0 } : EXIT_JIGGLE_SPRING,
        }}
      >
        {children(entry.size)}
      </motion.div>

      {isEditing && (
        <div
          role="button"
          aria-label={`Resize ${id} widget`}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            resizingRef.current = true;
            setIsResizing(true);
          }}
          onPointerMove={handleResizeMove}
          onPointerUp={(e) => {
            e.currentTarget.releasePointerCapture(e.pointerId);
            setIsResizing(false);
            handleResizeEnd();
          }}
          // Generous invisible touch target; the visible part is the
          // arc inside it.
          style={{
            position: "absolute",
            right: -6,
            bottom: -6,
            width: 36,
            height: 36,
            cursor: "nwse-resize",
            touchAction: "none",
            background: "none",
            zIndex: 1,
          }}
        >
          {/* Real iOS 18 resize handle: "a thicker border on the
              bottom right corner, shaped almost like a quarter of a
              circle" — an arc hugging the corner's own curvature just
              inside the widget edge, NOT a floating dot outside it
              (this component's first version). Radius follows the
              concentricity rule (materials-glass.md): widget radius 20
              at a 5px inset → 15. */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              right: 11, // 36 - 6 = 30px spans the corner; 11 here = 5px inside the widget edge
              bottom: 11,
              width: 18,
              height: 18,
              borderRight: "4px solid rgba(255, 255, 255, 0.95)",
              borderBottom: "4px solid rgba(255, 255, 255, 0.95)",
              borderBottomRightRadius: WIDGET_RADIUS - 5,
              filter: "drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5))",
              pointerEvents: "none",
            }}
          />
        </div>
      )}
    </motion.div>
  );
}
