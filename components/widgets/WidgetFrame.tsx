// components/widgets/WidgetFrame.tsx
"use client";

import { memo, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { animate, motion, useMotionValue, useReducedMotion, type PanInfo } from "framer-motion";
import { useWidgetLayout } from "@/contexts/WidgetLayoutContext";
import { useLongPress } from "@/lib/useLongPress";
import {
  cellRect,
  pointToCell,
  resolveCellCollision,
  spanForSize,
  type Occupancy,
  type Rect,
} from "@/lib/widgetPositioning";
import { nearestSizeTier, TIER_DIMENSIONS } from "@/lib/widgetSizeTiers";
import { CELL_STRIDE, WIDGET_RADIUS } from "@/lib/widgetGrid";
import type { WidgetId, WidgetSize } from "@/lib/widgetLayoutSchema";

// Apple's own default spring (SwiftUI response ≈ 0.5s, dampingFraction
// 0.8) expressed in Framer's duration/bounce form — used for position
// snap, tier morph, and drop, so every settle in the widget system
// shares one motion signature.
const WIDGET_SNAP_SPRING = { type: "spring", duration: 0.5, bounce: 0.2 } as const;
const EXIT_JIGGLE_SPRING = { type: "spring", duration: 0.35, bounce: 0 } as const;

// Apple's wiggle in three load-bearing details, none optional:
// 1. it's rotation LAYERED with a sub-pixel translate wobble whose
//    periods are incommensurate, so the composite never repeats;
// 2. amplitude scales DOWN with item size — a 354px widget swings
//    visibly less than a 170px one (±1° on an app icon is a much
//    bigger arc-length at widget scale, which is exactly why a
//    uniform amplitude reads as cartoonish on large widgets);
// 3. every item runs its own phase/period so a desktop of widgets
//    shimmers instead of marching in step.
const JIGGLE_AMPLITUDE: Record<WidgetSize, { rotate: number; translate: number }> = {
  small: { rotate: 1.0, translate: 0.7 },
  medium: { rotate: 0.75, translate: 0.55 },
  large: { rotate: 0.55, translate: 0.4 },
};

interface WidgetFrameProps {
  id: WidgetId;
  others: Occupancy[]; // every other widget's committed cell occupancy
  // Live drop-target outline: the white widget-shaped outline at the
  // cell where the widget will actually land — always a legal,
  // non-overlapping lattice position. null = not dragging.
  onSnapPreview: (rect: Rect | null) => void;
  children: (size: WidgetSize) => React.ReactNode;
}

// Memoized — WidgetCanvas re-renders on every drag frame of ANY widget
// (onSnapPreview lives there), and without this every OTHER widget's
// frame re-rendered too on every one of those frames. Only pays off
// because `others`/`children` are now stable references from the
// caller (see WidgetCanvas's othersById/renderById) — a memo whose
// props get a fresh identity every render is a no-op.
function WidgetFrameImpl({ id, others, onSnapPreview, children }: WidgetFrameProps) {
  const { layout, spec, isEditing, enterEditMode, moveWidget, resizeWidget } = useWidgetLayout();
  const prefersReducedMotion = useReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);
  const [liveSize, setLiveSize] = useState<{ width: number; height: number } | null>(null);
  const resizingRef = useRef(false);
  // Separate from resizingRef (a synchronous guard read inside the
  // pointermove handler, doesn't need to trigger a render): this is
  // what actually turns Framer Motion's own `drag` gesture off the
  // instant the resize handle is pressed. Without it, two independent
  // gesture systems fight over the same pointer on every move — the
  // page-freeze bug fixed in 89f02f8.
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // Bumped on every drop. Framer's declarative `animate` prop only
  // fires when the target VALUE changes — so a drag that resolves
  // back to the widget's own cell (target numerically unchanged)
  // would never spring the element home, leaving it visually parked
  // off-grid on top of whatever it was dropped over while the
  // committed state says otherwise. That one silent no-op was the
  // "widgets can still stack" bug. Position therefore runs on
  // imperative motion values, re-sprung on every commit AND every
  // drop, value-changed or not.
  const [dropNonce, setDropNonce] = useState(0);

  const entry = layout[id];
  const span = spanForSize(entry.size);
  const rect = cellRect(spec, entry, span);
  const width = liveSize?.width ?? rect.width;
  const height = liveSize?.height ?? rect.height;

  const mx = useMotionValue(rect.x);
  const my = useMotionValue(rect.y);

  useEffect(() => {
    if (prefersReducedMotion) {
      mx.set(rect.x);
      my.set(rect.y);
      return;
    }
    const ax = animate(mx, rect.x, WIDGET_SNAP_SPRING);
    const ay = animate(my, rect.y, WIDGET_SNAP_SPRING);
    return () => {
      ax.stop();
      ay.stop();
    };
  }, [rect.x, rect.y, dropNonce, prefersReducedMotion, mx, my]);

  useEffect(() => {
    return () => {
      if (resizeRafRef.current != null) cancelAnimationFrame(resizeRafRef.current);
    };
  }, []);

  const longPress = useLongPress(enterEditMode);

  // Deterministic per-widget desync (never Math.random() — server and
  // client must agree): each widget gets its own periods for the
  // three oscillations, a start-phase stagger, and a slightly
  // off-center transform origin. The translate periods are scaled off
  // the rotation's by irrational-ish factors so the composite motion
  // never visibly repeats.
  const jiggle = useMemo(() => {
    const seed = id.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const rotateDuration = 0.28 + (seed % 5) * 0.015; // 0.28 – 0.34s
    return {
      direction: seed % 2 === 0 ? 1 : -1,
      rotateDuration,
      xDuration: rotateDuration * 1.31,
      yDuration: rotateDuration * 0.77,
      delay: (seed % 7) * 0.02, // 0 – 0.12s start stagger
      origin: `${49 + (seed % 3)}% ${49 + ((seed >> 2) % 3)}%`,
    };
  }, [id]);

  // The jiggle pauses (and the widget lifts) while IT is being
  // dragged — real iOS: the picked-up item stops wiggling and scales
  // up while the rest keeps jiggling. Resize also pauses it so the
  // corner handle isn't chasing a rotating target.
  const jiggling = isEditing && !prefersReducedMotion && !isDragging && !isResizing;
  const amp = JIGGLE_AMPLITUDE[entry.size];

  // Best-effort landing cell for the LIVE preview outline only, using
  // this render's `others` snapshot — good enough for a mid-drag
  // visual guide. The actual commit (handleDragEnd) hands the raw
  // target cell to moveWidget instead of this resolved result: the
  // context re-resolves collision against its own freshest state
  // right before committing, which is the single authority for "is
  // this cell free" (see the comment on moveWidget in
  // WidgetLayoutContext.tsx for why that layer, not this one, has to
  // be where it's decided).
  const previewDropCell = useCallback(
    (liveX: number, liveY: number) => {
      const target = pointToCell(spec, liveX, liveY, span);
      return resolveCellCollision(spec, target, span, others);
    },
    [spec, span, others]
  );

  // While dragging, Framer writes the live position straight into
  // the mx/my motion values — reading them back gives the widget's
  // exact on-screen corner, no offset bookkeeping.
  const handleDrag = useCallback(() => {
    const cell = previewDropCell(mx.get(), my.get());
    onSnapPreview(cellRect(spec, cell, span));
  }, [mx, my, spec, span, previewDropCell, onSnapPreview]);

  const handleDragEnd = useCallback(() => {
    const target = pointToCell(spec, mx.get(), my.get(), span);
    onSnapPreview(null);
    setIsDragging(false);
    moveWidget(id, target);
    // Always re-spring to the committed cell — even when the commit
    // lands on the exact cell the widget started from (see dropNonce
    // comment above).
    setDropNonce((n) => n + 1);
  }, [mx, my, spec, span, onSnapPreview, moveWidget, id]);

  // The raw pointer event still supplies the freshest coordinates the
  // instant they arrive; only the React state COMMIT (and the render
  // it triggers) is coalesced to once per animation frame instead of
  // once per native pointermove, which can fire well above 60/s on a
  // high-poll-rate mouse or trackpad. Final size at drop still reads
  // this ref, not the (possibly one-frame-stale) `liveSize` state, so
  // precision is identical — only the update cadence changed.
  const pendingSizeRef = useRef<{ width: number; height: number } | null>(null);
  const resizeRafRef = useRef<number | null>(null);

  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (!resizingRef.current || !frameRef.current) return;
    const frame = frameRef.current.getBoundingClientRect();
    // The body tracks the finger 1:1 (content stretches with the
    // frame), clamped to just beyond the tier family's own range.
    const min = TIER_DIMENSIONS.small.width * 0.75;
    const max = TIER_DIMENSIONS.large.width * 1.15;
    pendingSizeRef.current = {
      width: Math.min(max, Math.max(min, e.clientX - frame.left)),
      height: Math.min(max, Math.max(min, e.clientY - frame.top)),
    };
    if (resizeRafRef.current == null) {
      resizeRafRef.current = requestAnimationFrame(() => {
        resizeRafRef.current = null;
        setLiveSize(pendingSizeRef.current);
      });
    }
  }, []);

  const handleResizeEnd = useCallback(() => {
    resizingRef.current = false;
    if (resizeRafRef.current != null) {
      cancelAnimationFrame(resizeRafRef.current);
      resizeRafRef.current = null;
    }
    const finalSize = pendingSizeRef.current ?? liveSize;
    if (finalSize) {
      const size = nearestSizeTier(finalSize.width, finalSize.height);
      // Same anchor cell the widget already occupies — resizeWidget
      // (authoritative, in the context) resolves collision against
      // its own freshest state before committing.
      resizeWidget(id, size, entry);
    }
    pendingSizeRef.current = null;
    setLiveSize(null);
  }, [id, liveSize, entry, resizeWidget]);

  return (
    <motion.div
      ref={frameRef}
      // Dragging requires edit mode (long-press first) — a plain
      // press/click on a widget interacts with its content, never
      // moves it.
      drag={isEditing && !isResizing}
      dragMomentum={false}
      // The gesture itself is fenced to the lattice's own extent —
      // a widget can never be carried off the desktop. The small
      // elastic factor gives Apple's rubber-band resistance at the
      // edges instead of a hard wall.
      dragConstraints={{
        left: spec.originX,
        top: spec.originY,
        right: spec.originX + (spec.cols - span.cols) * CELL_STRIDE,
        bottom: spec.originY + (spec.rows - span.rows) * CELL_STRIDE,
      }}
      dragElastic={0.15}
      onDragStart={() => setIsDragging(true)}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onPointerDown={longPress.onPointerDown}
      onPointerMove={longPress.onPointerMove}
      onPointerUp={() => longPress.onPointerUp()}
      onPointerLeave={longPress.onPointerLeave}
      onClickCapture={longPress.onClickCapture}
      // This outer div owns POSITION and FRAME SIZE. Position lives
      // on the mx/my motion values (imperatively re-sprung on every
      // commit/drop — see dropNonce above); the declarative animate
      // prop only carries frame size. During a resize drag,
      // width/height track the pointer with zero lag (duration 0);
      // on release, the tier morph runs through the shared snap
      // spring — the iPadOS "stretch live, spring to the tier" feel.
      animate={{ width, height }}
      transition={{
        width: liveSize || prefersReducedMotion ? { duration: 0 } : WIDGET_SNAP_SPRING,
        height: liveSize || prefersReducedMotion ? { duration: 0 } : WIDGET_SNAP_SPRING,
      }}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        x: mx,
        y: my,
        width,
        height,
        zIndex: isDragging || isResizing ? 40 : isEditing ? 30 : 20,
        touchAction: isEditing ? "none" : undefined,
      }}
    >
      {/* Inner wrapper: jiggle + pick-up lift, isolated from the
          outer div's position/size so the transforms never interfere.
          Fills the frame completely — the widget card inside renders
          at 100%×100%, which keeps the body (and the resize handle
          anchored to it) glued to the frame corner while the frame
          stretches. The handle lives INSIDE this wrapper so it
          rotates with the jiggling body instead of floating detached
          on the static frame. */}
      <motion.div
        animate={{
          rotate: jiggling
            ? [amp.rotate * jiggle.direction, -amp.rotate * jiggle.direction, amp.rotate * jiggle.direction]
            : 0,
          x: jiggling ? [amp.translate, -amp.translate, amp.translate] : 0,
          y: jiggling ? [-amp.translate, amp.translate, -amp.translate] : 0,
          scale: isDragging && !prefersReducedMotion ? 1.04 : 1,
        }}
        transition={{
          rotate: jiggling
            ? { duration: jiggle.rotateDuration, repeat: Infinity, ease: "easeInOut", delay: jiggle.delay }
            : EXIT_JIGGLE_SPRING,
          x: jiggling
            ? { duration: jiggle.xDuration, repeat: Infinity, ease: "easeInOut", delay: jiggle.delay }
            : EXIT_JIGGLE_SPRING,
          y: jiggling
            ? { duration: jiggle.yDuration, repeat: Infinity, ease: "easeInOut", delay: jiggle.delay }
            : EXIT_JIGGLE_SPRING,
          scale: prefersReducedMotion ? { duration: 0 } : EXIT_JIGGLE_SPRING,
        }}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformOrigin: jiggle.origin,
        }}
      >
        {/* Native-drag firewall: browsers start their own HTML5
            image-drag (the translucent ghost photo) the moment a
            pointer moves on an <img>, which hijacks the pointer
            stream mid-gesture — Framer's drag never gets its end
            event and the widget is left stranded off-grid. Killing
            dragstart here (and text selection with it) is what makes
            image-bearing widgets drag as widgets. */}
        <div
          style={{ width: "100%", height: "100%", userSelect: "none" }}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
        >
          {children(entry.size)}
        </div>

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
            // Generous invisible touch target; the visible part is
            // the arc inside it.
            style={{
              position: "absolute",
              right: -6,
              bottom: -6,
              width: 44,
              height: 44,
              cursor: "nwse-resize",
              touchAction: "none",
              background: "none",
              zIndex: 2,
            }}
          >
            {/* iPadOS-style resize affordance: a thick quarter-circle
                arc hugging the widget's own bottom-right corner just
                inside its edge — concentric with the widget radius
                (materials-glass.md): radius 22 at a 5px inset → 17. */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                right: 11, // 6px overhang + 5px inset from the widget edge
                bottom: 11,
                width: 20,
                height: 20,
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
    </motion.div>
  );
}

export default memo(WidgetFrameImpl);
