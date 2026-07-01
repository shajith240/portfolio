"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useMotionValue, useDragControls, animate } from "framer-motion";
import { useWindowManager, type WindowState } from "@/contexts/WindowManagerContext";

/* macOS-authentic window chrome. Dragging uses Framer Motion's own
   drag system (dragListener={false} + useDragControls started only
   from the titlebar) — NOT a hand-rolled pointer-tracking loop. The
   Dock's own bug history this session (stuck-open magnification,
   desynced width) came specifically from re-implementing continuous
   drag/position tracking by hand; Framer already owns this correctly.
   See docs/superpowers/specs/2026-07-01-window-manager-design.md. */

const OPEN_SPRING = { type: "spring", stiffness: 300, damping: 28, mass: 0.9 } as const;
const BOUNDS_SPRING = { type: "spring", stiffness: 340, damping: 32, mass: 0.9 } as const;

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
        width: "12px",
        height: "12px",
        borderRadius: "50%",
        background: showColor ? color : grayColor,
        border: "none",
        padding: 0,
        cursor: "default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.1s ease",
      }}
    >
      <span style={{ opacity: hovered && showColor ? 1 : 0, display: "flex" }}>
        {hoverGlyph}
      </span>
    </button>
  );
};

const CloseGlyph = () => (
  <svg width="7" height="7" viewBox="0 0 8 8"><path d="M1 1L7 7M7 1L1 7" stroke="rgba(0,0,0,0.55)" strokeWidth="1.2" strokeLinecap="round" /></svg>
);
const MinimizeGlyph = () => (
  <svg width="7" height="7" viewBox="0 0 8 8"><path d="M1 4H7" stroke="rgba(0,0,0,0.55)" strokeWidth="1.2" strokeLinecap="round" /></svg>
);
const ZoomGlyph = () => (
  <svg width="6" height="6" viewBox="0 0 8 8"><path d="M1 5L5 1M5 1H2M5 1V4" stroke="rgba(0,0,0,0.55)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export default function Window({ win, active }: { win: WindowState; active: boolean }) {
  const { closeWindow, minimizeWindow, toggleMaximize, bringToFront, updateBounds, getDockIconRect } = useWindowManager();
  const dragControls = useDragControls();
  const rootRef = useRef<HTMLDivElement>(null);
  const [lightsHovered, setLightsHovered] = useState(false);

  const x = useMotionValue(win.x);
  const y = useMotionValue(win.y);
  const width = useMotionValue(win.width);
  const height = useMotionValue(win.height);
  const scale = useMotionValue(1);
  const opacity = useMotionValue(1);

  // Play the "genie" open animation once, from the triggering Dock icon.
  useEffect(() => {
    const iconRect = getDockIconRect(win.route);
    if (iconRect) {
      x.set(iconRect.left);
      y.set(iconRect.top);
      width.set(iconRect.width);
      height.set(iconRect.height);
      scale.set(0.3);
      opacity.set(0);
      animate(x, win.x, OPEN_SPRING);
      animate(y, win.y, OPEN_SPRING);
      animate(width, win.width, OPEN_SPRING);
      animate(height, win.height, OPEN_SPRING);
      animate(scale, 1, OPEN_SPRING);
      animate(opacity, 1, { duration: 0.2 });
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
    const iconRect = getDockIconRect(win.route);
    const targetX = iconRect ? iconRect.left : win.x;
    const targetY = iconRect ? iconRect.top : win.y;
    animate(x, targetX, OPEN_SPRING);
    animate(y, targetY, OPEN_SPRING);
    animate(scale, 0.25, OPEN_SPRING);
    animate(opacity, 0, { duration: 0.18, onComplete: () => minimizeWindow(win.id) });
  };

  return (
    <motion.div
      ref={rootRef}
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      onDragEnd={() => updateBounds(win.id, { x: x.get(), y: y.get() })}
      onPointerDown={() => bringToFront(win.id)}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        x,
        y,
        width,
        height,
        scale,
        opacity,
        zIndex: win.zIndex,
        borderRadius: "12px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 30px 70px rgba(0, 0, 0, 0.45), 0 2px 0 rgba(255, 255, 255, 0.06) inset",
        border: "0.5px solid var(--glass-border)",
      }}
    >
      {/* Titlebar — only this initiates drag, so iframe content never fights it */}
      <div
        onPointerDown={(e) => dragControls.start(e)}
        onDoubleClick={() => toggleMaximize(win.id)}
        style={{
          height: "28px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          padding: "0 10px",
          background: "var(--glass-regular-bg)",
          backdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
          WebkitBackdropFilter: "blur(var(--glass-blur-regular)) saturate(var(--glass-saturate))",
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
          style={{ display: "flex", gap: "8px", zIndex: 1, cursor: "default" }}
        >
          <TrafficLight
            color="#FF5F57"
            grayColor="rgba(255, 255, 255, 0.10)"
            hoverGlyph={<CloseGlyph />}
            onClick={() => closeWindow(win.id)}
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

      <iframe
        src={`${win.route}${win.route.includes("?") ? "&" : "?"}__window=1`}
        title={win.title}
        style={{ flex: 1, border: "none", background: "var(--bg-page)" }}
      />
    </motion.div>
  );
}
