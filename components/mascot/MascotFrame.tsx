"use client";

import { useLayoutEffect, useRef } from "react";
import { applyLiquidGlass, releaseLiquidGlass } from "@/lib/liquidGlass";
import { WIDGET_RADIUS } from "@/lib/widgetGrid";
import type { Rect } from "@/lib/widgetPositioning";

/* The mascot's home frame on the desktop — a Liquid Glass squircle in
   the widget lattice's top-left cell (lib/mascotSlot.ts), where the
   photo widget used to be, so the character reads as a "live photo" of
   Shajith among the widgets.

   It's a SIBLING drawn behind the mascot, never its container: MASCOT.md
   forbids transformed or animated ancestors (the head aims from its own
   box), and the frame fades in and out on its own as the mascot leaves
   for a window and comes back. Press = light only (no squish: nothing
   here may transform). Clicking it opens the chat, like the mascot. */

export default function MascotFrame({
  rect,
  visible,
  zIndex,
  onOpen,
}: {
  rect: Rect;
  visible: boolean;
  zIndex: number;
  onOpen: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    applyLiquidGlass(el, {
      radius: WIDGET_RADIUS,
      bezel: 16,
      strength: 0.6,
      blur: 6,
      brightness: 0.82,
      tint: 0.2,
      press: "glow",
    });
    return () => releaseLiquidGlass(el);
    // The frame's size is fixed (one lattice cell); only its position
    // changes with the viewport, which the backdrop filter doesn't care about.
  }, [rect.width, rect.height]);

  return (
    <div
      ref={ref}
      className="liquid-glass"
      onClick={onOpen}
      aria-hidden
      style={{
        position: "fixed",
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        borderRadius: WIDGET_RADIUS,
        overflow: "hidden",
        zIndex,
        opacity: visible ? 1 : 0,
        // Opacity only (simple CSS transition is allowed by CLAUDE.md),
        // on the glass element itself — never on an ancestor of glass.
        transition: "opacity 160ms ease",
        pointerEvents: visible ? "auto" : "none",
        cursor: "pointer",
      }}
    >
      {/* Soft "studio light" behind the figure, so it sits in the frame
          like a portrait rather than floating on glass. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 90% at 50% 18%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 45%, rgba(0,0,0,0) 70%), linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.18) 100%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
