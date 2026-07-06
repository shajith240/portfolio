"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useMotionValue, useDragControls, animate } from "framer-motion";
import { useWindowManager, getPositionBounds, type WindowState } from "@/contexts/WindowManagerContext";
import { genieClipPath } from "@/lib/genieClipPath";
import { applyLiquidGlass, releaseLiquidGlass } from "@/lib/liquidGlass";
import FinderApp from "@/components/window/FinderApp";

/* macOS-authentic window chrome. Dragging uses Framer Motion's own
   drag system (dragListener={false} + useDragControls started only
   from the titlebar) — NOT a hand-rolled pointer-tracking loop. The
   Dock's own bug history this session (stuck-open magnification,
   desynced width) came specifically from re-implementing continuous
   drag/position tracking by hand; Framer already owns this correctly.
   See docs/superpowers/specs/2026-07-01-window-manager-design.md. */

const BOUNDS_SPRING = { type: "spring", stiffness: 340, damping: 32, mass: 0.9 } as const;
const ZOOM_SPRING = { type: "spring", stiffness: 380, damping: 36 } as const;
const MIN_WIDTH = 480;
const MIN_HEIGHT = 320;
const RESIZE_EDGE_WIDTH = 6;
const RESIZE_CORNER_SIZE = 12;

// Genie open/minimize: every animated property (position, scale,
// opacity, clip-path funnel) uses this exact same duration/ease, not a
// mix of springs and fixed durations. A spring has no precisely
// predictable finish time — mixing one with the clip-path's fixed
// 380ms meant the opacity fade (previously a separate, shorter 180ms
// tween) completed and unmounted the window BEFORE the position/scale
// animation had actually reached the Dock icon, cutting the
// convergence off mid-flight. Same duration everywhere means nothing
// finishes early or late relative to anything else.
const GENIE_DURATION = 0.38;
const GENIE_EASE = [0.4, 0, 0.2, 1] as const;
const GENIE_TWEEN = { duration: GENIE_DURATION, ease: GENIE_EASE } as const;

const TrafficLight = ({
  color,
  grayColor,
  hoverGlyph,
  onClick,
  title,
  active,
  groupHovered,
}: {
  color: string;
  grayColor: string;
  hoverGlyph: React.ReactNode;
  onClick: () => void;
  title: string;
  active: boolean;
  groupHovered: boolean;
}) => {
  const [hovered, setHovered] = useState(false);
  // Real macOS: an unfocused window's traffic lights sit gray until you
  // hover the titlebar's button cluster (any of the three), at which
  // point all three preview their true colors — not just the one under
  // the cursor.
  const showColor = active || groupHovered;

  return (
    <button
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title}
      style={{
        // The visible dot is 12px (matches real macOS), but the
        // clickable/hoverable area is deliberately larger — a hit box
        // exactly the size of the dot sits pixel-for-pixel against the
        // titlebar's "grab" cursor, so a sub-pixel mouse offset flips
        // between "default" and "grab" and reads as broken. Real macOS
        // gives these buttons a generously padded hit area for exactly
        // this reason.
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          background: showColor ? color : grayColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.1s ease",
        }}
      >
        {/* Real macOS shows ALL THREE glyphs the moment the cursor
            hovers anywhere over the button cluster — not just the
            glyph under the cursor. That's why this reads
            groupHovered, not this button's own hover state. */}
        <span style={{ opacity: groupHovered && showColor ? 1 : 0, display: "flex", transition: "opacity 0.1s ease" }}>
          {hoverGlyph}
        </span>
      </span>
    </button>
  );
};

/* Glyphs are dark TINTS of each button's own color (never a shared
   black) — close ≈ deep red, minimize ≈ deep amber, zoom ≈ deep
   green — and the zoom glyph is two opposing expand triangles, not
   an arrow or a plus. [Confirmed across Big Sur–Sequoia.] */
const CloseGlyph = () => (
  <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" stroke="#4D0000" strokeWidth="1.1" strokeLinecap="round" /></svg>
);
const MinimizeGlyph = () => (
  <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1.2 4H6.8" stroke="#995700" strokeWidth="1.4" strokeLinecap="round" /></svg>
);
const ZoomGlyph = () => (
  <svg width="8" height="8" viewBox="0 0 8 8">
    {/* two right triangles pointing into opposite corners */}
    <path d="M1.2 3.6 V6.8 H4.4 Z" fill="#006400" />
    <path d="M6.8 4.4 V1.2 H3.6 Z" fill="#006400" />
  </svg>
);

export default function Window({ win, active }: { win: WindowState; active: boolean }) {
  const { closeWindow, minimizeWindow, toggleMaximize, bringToFront, updateBounds, getDockIconRect } = useWindowManager();
  const dragControls = useDragControls();
  const rootRef = useRef<HTMLDivElement>(null);
  const glassLayerRef = useRef<HTMLDivElement | null>(null);
  const [lightsHovered, setLightsHovered] = useState(false);
  // While the window is being dragged, the content iframe must stop
  // receiving pointer events AND stop being interactive — a live
  // iframe under a moving cursor both swallows the pointer stream
  // (drag freezes when the cursor crosses it) and forces content
  // repaints mid-drag. This is the standard fix, same as every
  // window-manager-in-the-browser does it.
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  // clip-path takes precedence over border-radius for clipping a
  // element's own children (border-radius still governs the border/
  // box-shadow, which is why this bug only ever showed up as a faint
  // square sliver right at the rounded corners, not a fully square
  // window). Leaving clipPathStr's genie funnel applied at rest —
  // even fully unfurled it's still a sharp-cornered rectangle polygon
  // — silently overrode the 12px border-radius clipping for real. Only
  // apply clip-path while a genie animation is actually in flight;
  // otherwise omit it so plain border-radius + overflow:hidden clips
  // the corners correctly.
  const [clipActive, setClipActive] = useState(true);
  // Store the pre-zoom bounds so double-click zoom can toggle between them
  const preZoomBoundsRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  // Liquid Glass on the window body — real refraction engine on the
  // existing blur layer (already isolated from the outer transformed
  // element for the corner-bleed fix below, which is exactly the
  // right host: a plain, non-transformed, absolutely-positioned
  // child). Debounced ResizeObserver: the window resizes on every
  // pointermove during a drag-resize or zoom, and rebuilding the
  // displacement canvas on every one of those would be jank — only
  // rebuild 120ms after sizing settles.
  useEffect(() => {
    const el = glassLayerRef.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const apply = () => applyLiquidGlass(el, { radius: 12, bezel: 12, strength: 0.55, blur: 8, brightness: 0.84, tint: 0.13 });
    apply();
    const ro = new ResizeObserver(() => {
      if (t) clearTimeout(t);
      t = setTimeout(apply, 120);
    });
    ro.observe(el);
    return () => {
      if (t) clearTimeout(t);
      ro.disconnect();
      releaseLiquidGlass(el);
    };
  }, []);

  // Keeps the titlebar always reachable by drag alone — the bug this
  // guards against: dragging a window until its titlebar is fully
  // off-screen leaves no way to grab it back. Recomputed on resize so
  // shrinking the browser doesn't leave a stale, too-permissive bound.
  const [dragBounds, setDragBounds] = useState(() => getPositionBounds(win.width));
  useEffect(() => {
    const update = () => setDragBounds(getPositionBounds(win.width));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [win.width]);

  const x = useMotionValue(win.x);
  const y = useMotionValue(win.y);
  const width = useMotionValue(win.width);
  const height = useMotionValue(win.height);
  const scale = useMotionValue(1);
  const opacity = useMotionValue(1);
  // Drives the genie clip-path funnel: 0 = full rectangle, 1 = fully
  // collapsed into a narrow neck. clipPathStr is the derived CSS string —
  // Framer motion values don't interpolate strings on their own, so
  // genieProgress (a plain number) is what actually gets animated, and
  // its onUpdate recomputes clipPathStr each frame. See lib/genieClipPath.ts.
  const genieProgress = useMotionValue(1);
  const clipPathStr = useMotionValue(genieClipPath(1));

  // Genie convergence math. Fixed to a single mechanism: `scale` only
  // (never also resize the width/height motion values — animating both
  // at once, as an earlier version did, means there's no one stable
  // point to converge on, which is exactly why it read as imprecise/
  // "falling apart"). transformOrigin is bottom-center (see the style
  // block below) to match the clip-path funnel's neck, which also sits
  // at bottom-center. With that anchor fixed, scaling toward 0 always
  // shrinks the box toward whatever point `x + width/2, y + height`
  // currently is — so animating x/y to the values below makes that
  // exact point converge on the Dock icon's center, not just its
  // top-left corner.
  const genieTarget = (iconRect: DOMRect | null) => {
    if (!iconRect) return { x: win.x, y: win.y };
    const iconCenterX = iconRect.left + iconRect.width / 2;
    const iconCenterY = iconRect.top + iconRect.height / 2;
    return {
      x: iconCenterX - win.width / 2,
      y: iconCenterY - win.height,
    };
  };

  // Play the "genie" open animation once, from the triggering Dock icon —
  // starts fully collapsed (genieProgress 1) and unfurls to a full
  // rectangle (0), reversing the same funnel the minimize animation uses.
  // If no Dock icon is available, use the standard macOS window open animation:
  // scale 0.92 → 1 with opacity 0 → 1, transformOrigin "center 60%", with a
  // decelerating ease (not springy).
  useEffect(() => {
    const iconRect = getDockIconRect(win.route);
    if (iconRect) {
      const start = genieTarget(iconRect);
      x.set(start.x);
      y.set(start.y);
      scale.set(0.04);
      opacity.set(0);
      genieProgress.set(1);
      clipPathStr.set(genieClipPath(1));
      animate(x, win.x, GENIE_TWEEN);
      animate(y, win.y, GENIE_TWEEN);
      animate(scale, 1, GENIE_TWEEN);
      // Mirrors the minimize keyframing: opacity snaps up quickly at
      // the start rather than fading in linearly, since the real
      // effect appears already-opaque as a tiny sliver at the icon and
      // stays that way while it unfurls.
      animate(opacity, [0, 1, 1], { ...GENIE_TWEEN, times: [0, 0.15, 1] });
      animate(genieProgress, 0, {
        ...GENIE_TWEEN,
        onUpdate: (p) => clipPathStr.set(genieClipPath(p)),
        onComplete: () => setClipActive(false),
      });
    } else {
      // Standard macOS window open: scale 0.92 → 1 with opacity 0 → 1,
      // using a decelerating ease curve (Tahoe style, not springy).
      const OPEN_TWEEN = { duration: 0.32, ease: [0.32, 0.72, 0, 1] } as const;
      scale.set(0.92);
      opacity.set(0);
      animate(scale, 1, OPEN_TWEEN);
      animate(opacity, 1, OPEN_TWEEN);
      setClipActive(false);
    }
    // Only on mount — this is the window's one-time launch animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External bounds changes (maximize/restore) animate smoothly; drag
  // itself updates x/y directly through Framer's own drag system, so
  // this effect re-firing after a drag-end commit just re-confirms the
  // same value it's already at — harmless, not a feedback loop.
  useEffect(() => {
    animate(x, win.x, BOUNDS_SPRING);
    animate(y, win.y, BOUNDS_SPRING);
    animate(width, win.width, BOUNDS_SPRING);
    animate(height, win.height, BOUNDS_SPRING);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.x, win.y, win.width, win.height]);

  const handleMinimize = () => {
    setClipActive(true);
    const iconRect = getDockIconRect(win.route);
    const target = genieTarget(iconRect);
    animate(x, target.x, GENIE_TWEEN);
    animate(y, target.y, GENIE_TWEEN);
    animate(scale, 0.04, GENIE_TWEEN);
    // onComplete lives here, not on a separate shorter fade — this is
    // now the same duration as every other property in this gesture,
    // so unmounting via minimizeWindow() only happens once the
    // position/scale/clip-path convergence has actually finished.
    // Keyframed rather than a linear 1->0 fade: real macOS doesn't turn
    // translucent mid-shrink, it stays opaque and only vanishes once
    // it's collapsed to essentially the icon's size, so opacity holds
    // at 1 for the first 85% and only drops in the final stretch.
    animate(opacity, [1, 1, 0], {
      ...GENIE_TWEEN,
      times: [0, 0.85, 1],
      onComplete: () => minimizeWindow(win.id),
    });
    animate(genieProgress, 1, {
      ...GENIE_TWEEN,
      onUpdate: (p) => clipPathStr.set(genieClipPath(p)),
    });
  };

  const handleClose = () => {
    // Trigger window close: the exit animation is handled by Framer Motion's
    // exit prop and AnimatePresence in the parent. closeWindow removes the
    // window from state, which unmounts this component and plays the exit.
    closeWindow(win.id);
  };

  const handleResizeStart = (
    e: React.PointerEvent<HTMLDivElement>,
    edge: "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se"
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setResizing(true);
    bringToFront(win.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = width.get();
    const startHeight = height.get();
    const startWindowX = x.get();
    const startWindowY = y.get();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startWindowX;
      let newY = startWindowY;

      // Horizontal edges/corners: e, w, ne, nw, se, sw
      if (edge.includes("e")) {
        newWidth = Math.max(MIN_WIDTH, startWidth + deltaX);
      } else if (edge.includes("w")) {
        newWidth = Math.max(MIN_WIDTH, startWidth - deltaX);
        newX = startWindowX + deltaX;
      }

      // Vertical edges/corners: n, s, ne, nw, se, sw
      if (edge.includes("s")) {
        newHeight = Math.max(MIN_HEIGHT, startHeight + deltaY);
      } else if (edge.includes("n")) {
        newHeight = Math.max(MIN_HEIGHT, startHeight - deltaY);
        newY = startWindowY + deltaY;
      }

      x.set(newX);
      y.set(newY);
      width.set(newWidth);
      height.set(newHeight);
    };

    const handlePointerUp = () => {
      setResizing(false);
      updateBounds(win.id, {
        x: x.get(),
        y: y.get(),
        width: width.get(),
        height: height.get(),
      });
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  };

  const handleTitlebarDoubleClick = () => {
    const currentX = x.get();
    const currentY = y.get();
    const currentWidth = width.get();
    const currentHeight = height.get();

    // If we have pre-zoom bounds stored and they match current, restore to pre-zoom
    if (
      preZoomBoundsRef.current &&
      Math.abs(preZoomBoundsRef.current.x - currentX) < 1 &&
      Math.abs(preZoomBoundsRef.current.y - currentY) < 1 &&
      Math.abs(preZoomBoundsRef.current.width - currentWidth) < 1 &&
      Math.abs(preZoomBoundsRef.current.height - currentHeight) < 1
    ) {
      // Already at zoom, restore pre-zoom bounds
      const prevBounds = preZoomBoundsRef.current;
      animate(x, prevBounds.x, ZOOM_SPRING);
      animate(y, prevBounds.y, ZOOM_SPRING);
      animate(width, prevBounds.width, ZOOM_SPRING);
      animate(height, prevBounds.height, ZOOM_SPRING);
      preZoomBoundsRef.current = null;
      updateBounds(win.id, { x: prevBounds.x, y: prevBounds.y, width: prevBounds.width, height: prevBounds.height });
    } else {
      // Not at zoom, store current bounds and zoom
      preZoomBoundsRef.current = { x: currentX, y: currentY, width: currentWidth, height: currentHeight };

      // Calculate zoom bounds: viewport minus menu bar (24px top), Dock clearance (90px bottom), 12px side margins
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const MENU_BAR_HEIGHT = 24;
      const DOCK_CLEARANCE = 90;
      const SIDE_MARGIN = 12;

      const zoomX = SIDE_MARGIN;
      const zoomY = MENU_BAR_HEIGHT;
      const zoomWidth = Math.max(MIN_WIDTH, viewportWidth - 2 * SIDE_MARGIN);
      const zoomHeight = Math.max(MIN_HEIGHT, viewportHeight - MENU_BAR_HEIGHT - DOCK_CLEARANCE);

      animate(x, zoomX, ZOOM_SPRING);
      animate(y, zoomY, ZOOM_SPRING);
      animate(width, zoomWidth, ZOOM_SPRING);
      animate(height, zoomHeight, ZOOM_SPRING);
      updateBounds(win.id, { x: zoomX, y: zoomY, width: zoomWidth, height: zoomHeight });
    }
  };

  return (
    <motion.div
      ref={rootRef}
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={{ left: dragBounds.minX, right: dragBounds.maxX, top: dragBounds.minY, bottom: dragBounds.maxY }}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => {
        setDragging(false);
        updateBounds(win.id, { x: x.get(), y: y.get() });
      }}
      onPointerDown={() => bringToFront(win.id)}
      exit={{ scale: 0.96, opacity: 0 }}
      transition={{
        scale: { duration: 0.16, ease: [0.6, 0.1, 0.84, 0.1] },
        opacity: { duration: 0.16, ease: [0.6, 0.1, 0.84, 0.1] },
      }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        x,
        y,
        width,
        height,
        scale,
        transformOrigin: "50% 100%",
        opacity,
        ...(clipActive ? { clipPath: clipPathStr, WebkitClipPath: clipPathStr } : {}),
        zIndex: win.zIndex,
        borderRadius: "12px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 30px 70px rgba(0, 0, 0, 0.45), 0 2px 0 rgba(255, 255, 255, 0.06) inset",
        border: "0.5px solid var(--glass-border)",
      }}
    >
      {/* Blur lives on its own plain (non-transformed) layer, not the
          outer motion.div — Chromium/WebKit have a long-standing bug
          where backdrop-filter + border-radius + a CSS transform on the
          SAME element lets a hairline sliver of unclipped blur bleed
          past the rounded corner (reads as a faint square notch right
          at the corner). Since overflow:hidden on the outer element
          still clips a plain child correctly, moving backdrop-filter to
          this absolutely-positioned child sidesteps the bug entirely
          while still reading as one continuous frosted material behind
          the titlebar + body tint layers. */}
      <div
        ref={glassLayerRef}
        aria-hidden
        className="liquid-glass"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          borderRadius: "12px",
        }}
      />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Titlebar — only this initiates drag, so iframe content never fights it */}
      <div
        onPointerDown={(e) => dragControls.start(e)}
        onDoubleClick={handleTitlebarDoubleClick}
        style={{
          height: "28px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          padding: "0 10px",
          background: "var(--glass-regular-bg)",
          borderBottom: "0.5px solid var(--glass-border)",
          cursor: "grab",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onMouseEnter={() => setLightsHovered(true)}
          onMouseLeave={() => setLightsHovered(false)}
          // gap: 0 is intentional — each button is now a 20px hit box
          // with its 12px visible dot centered inside, so 0 gap between
          // boxes reproduces the same 20px dot-to-dot pitch real macOS
          // uses (previously: 12px dot + 8px gap = the same 20px pitch).
          // marginLeft compensates for the 4px inset the larger hit box
          // added, so the first dot lands exactly where it did before
          // (flush with the titlebar's existing 10px padding), not 4px
          // further right.
          style={{ display: "flex", gap: "0px", zIndex: 1, cursor: "default", marginLeft: "-4px" }}
        >
          <TrafficLight
            color="#FF5F57"
            grayColor="rgba(255, 255, 255, 0.10)"
            hoverGlyph={<CloseGlyph />}
            onClick={handleClose}
            title="Close"
            active={active}
            groupHovered={lightsHovered}
          />
          <TrafficLight
            color="#FEBC2E"
            grayColor="rgba(255, 255, 255, 0.10)"
            hoverGlyph={<MinimizeGlyph />}
            onClick={handleMinimize}
            title="Minimize"
            active={active}
            groupHovered={lightsHovered}
          />
          <TrafficLight
            color="#28C840"
            grayColor="rgba(255, 255, 255, 0.10)"
            hoverGlyph={<ZoomGlyph />}
            onClick={() => toggleMaximize(win.id)}
            title="Zoom"
            active={active}
            groupHovered={lightsHovered}
          />
        </div>
        <span
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: "13px",
            fontWeight: 600,
            color: active ? "var(--text-primary)" : "var(--text-dim)",
            pointerEvents: "none",
            transition: "color 0.15s ease",
          }}
        >
          {win.title}
        </span>
      </div>

      {win.kind === "finder" ? (
        <FinderApp />
      ) : (
        <iframe
          src={`${win.route}${win.route.includes("?") ? "&" : "?"}__window=1`}
          title={win.title}
          style={{ flex: 1, border: "none", background: "var(--bg-page)", pointerEvents: dragging || resizing ? "none" : "auto" }}
        />
      )}
      </div>

      {/* Resize zones: 6px-wide edges + 12px corners, invisible but with cursors */}
      {/* Top edge */}
      <div
        onPointerDown={(e) => handleResizeStart(e, "n")}
        style={{
          position: "absolute",
          top: 0,
          left: RESIZE_CORNER_SIZE,
          right: RESIZE_CORNER_SIZE,
          height: RESIZE_EDGE_WIDTH,
          cursor: "n-resize",
          zIndex: 100,
        }}
      />
      {/* Bottom edge */}
      <div
        onPointerDown={(e) => handleResizeStart(e, "s")}
        style={{
          position: "absolute",
          bottom: 0,
          left: RESIZE_CORNER_SIZE,
          right: RESIZE_CORNER_SIZE,
          height: RESIZE_EDGE_WIDTH,
          cursor: "s-resize",
          zIndex: 100,
        }}
      />
      {/* Left edge */}
      <div
        onPointerDown={(e) => handleResizeStart(e, "w")}
        style={{
          position: "absolute",
          left: 0,
          top: RESIZE_CORNER_SIZE,
          bottom: RESIZE_CORNER_SIZE,
          width: RESIZE_EDGE_WIDTH,
          cursor: "w-resize",
          zIndex: 100,
        }}
      />
      {/* Right edge */}
      <div
        onPointerDown={(e) => handleResizeStart(e, "e")}
        style={{
          position: "absolute",
          right: 0,
          top: RESIZE_CORNER_SIZE,
          bottom: RESIZE_CORNER_SIZE,
          width: RESIZE_EDGE_WIDTH,
          cursor: "e-resize",
          zIndex: 100,
        }}
      />
      {/* Top-left corner */}
      <div
        onPointerDown={(e) => handleResizeStart(e, "nw")}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: RESIZE_CORNER_SIZE,
          height: RESIZE_CORNER_SIZE,
          cursor: "nw-resize",
          zIndex: 100,
        }}
      />
      {/* Top-right corner */}
      <div
        onPointerDown={(e) => handleResizeStart(e, "ne")}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: RESIZE_CORNER_SIZE,
          height: RESIZE_CORNER_SIZE,
          cursor: "ne-resize",
          zIndex: 100,
        }}
      />
      {/* Bottom-left corner */}
      <div
        onPointerDown={(e) => handleResizeStart(e, "sw")}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: RESIZE_CORNER_SIZE,
          height: RESIZE_CORNER_SIZE,
          cursor: "sw-resize",
          zIndex: 100,
        }}
      />
      {/* Bottom-right corner */}
      <div
        onPointerDown={(e) => handleResizeStart(e, "se")}
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: RESIZE_CORNER_SIZE,
          height: RESIZE_CORNER_SIZE,
          cursor: "se-resize",
          zIndex: 100,
        }}
      />
    </motion.div>
  );
}
