"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import { PROJECTS } from "@/data/projects";
import { useLiquidGlass } from "@/lib/liquidGlass";

/* macOS Notification Center — opens from the menu-bar clock (the
   real trigger since Big Sur), slides in from the right edge.

   Faithful anatomy: there is NO panel chrome — macOS NC is a bare
   column of floating cards over the desktop, no backdrop dim, no
   container border. Content is entirely real (house rule):

   - Calendar card: today's actual date, macOS calendar-widget
     typography (red weekday label over a large day numeral).
   - GitHub card: the real contribution heatmap (the widget
     self-measures, so it adapts to the card's width).
   - Latest-project card: first project from data/projects.ts;
     clicking it opens the Projects window.

   MUST be portaled to <body>: the trigger lives in the menu bar,
   whose backdrop-filter makes it the containing block for
   fixed-position descendants (same trap the Control Center dim
   overlay hit). */

/* Every card is a Liquid Glass surface — refraction engine + rim
   class; this style only carries shape. */
const CARD_STYLE: React.CSSProperties = {
  borderRadius: "16px",
  overflow: "hidden",
};

function NCCard({
  children,
  as,
  onClick,
  style,
}: {
  children: React.ReactNode;
  as?: "button";
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  const ref = useLiquidGlass<HTMLDivElement>({ radius: 16, bezel: 12, strength: 0.58, blur: 5, brightness: 0.88, tint: 0.24 });
  const shared = { ...CARD_STYLE, ...style };
  if (as === "button") {
    return (
      <button
        ref={ref as React.RefObject<HTMLButtonElement | null> as never}
        className="liquid-glass"
        onClick={onClick}
        style={{ ...shared, border: "none", textAlign: "left", cursor: "default", display: "block", width: "100%" }}
      >
        {children}
      </button>
    );
  }
  return (
    <div ref={ref} className="liquid-glass" style={shared}>
      {children}
    </div>
  );
}

export default function NotificationCenter({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { openWindow } = useWindowManager();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointer = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  const now = new Date();
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = now.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const latest = PROJECTS[0];

  return createPortal(
    <AnimatePresence>
      {open && (
        // Opacity-only entrance: sliding cards that carry
        // backdrop-filter forces the blur to re-render over moving
        // content for the whole slide — that was the "glass loads
        // late" artifact. Opacity composites on the GPU; the blur
        // renders once, already in place.
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0, 0, 0.58, 1] }}
          style={{
            position: "fixed",
            top: "32px",
            right: "8px",
            width: "330px",
            maxHeight: "calc(100vh - 120px)",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            zIndex: 2500,
            padding: "2px", // room for card shadows inside the scroll area
          }}
        >
          {/* Calendar card */}
          <NCCard style={{ padding: "14px 16px" }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#ff453a",
                marginBottom: "2px",
              }}
            >
              {weekday}
            </div>
            <div style={{ fontSize: "30px", fontWeight: 300, color: "rgba(255,255,255,0.95)", lineHeight: 1.1 }}>
              {monthDay}
            </div>
          </NCCard>

          {/* Latest project card */}
          <NCCard
            as="button"
            onClick={() => {
              onClose();
              openWindow("/projects", "Projects");
            }}
            style={{ padding: "14px 16px" }}
          >
            <div style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}>
              Latest project
            </div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,0.95)", marginBottom: "3px" }}>
              {latest.title}
            </div>
            <div
              style={{
                fontSize: "12.5px",
                lineHeight: 1.45,
                color: "rgba(255,255,255,0.55)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {latest.description}
            </div>
          </NCCard>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
