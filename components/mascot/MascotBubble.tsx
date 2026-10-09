"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useLiquidGlass } from "@/lib/liquidGlass";

/* The mascot's speech bubble — a small Liquid Glass surface beside its
   head. Rendered as its own fixed element, never inside the mascot's
   fading wrapper: an ancestor's opacity makes it a backdrop root, which
   blanks a glass descendant mid-fade (docs/design-system/materials-glass.md).
   Its own opacity/scale are animated on the glass element itself. */

export interface BubbleAnchor {
  left: number; // mascot box, viewport px
  top: number;
  size: number;
}

const MAX_WIDTH = 260;
// What the bubble must not cover, as fractions of the anchor box. The
// bare sprite's drawing spans roughly 14%–86% of its box (the rest is
// transparent); a framed mascot passes the frame's full edges (0–1).
export interface FigureBounds {
  left: number;
  right: number;
}
export const SPRITE_FIGURE: FigureBounds = { left: 0.14, right: 0.86 };
export const FRAME_FIGURE: FigureBounds = { left: 0, right: 1 };
const GAP = 8;

export default function MascotBubble({
  text,
  anchor,
  zIndex,
  floor = 0,
  figure = SPRITE_FIGURE,
  onDismiss,
}: {
  text: string;
  anchor: BubbleAnchor;
  zIndex: number; // just above the mascot's own layer
  floor?: number; // px from the viewport bottom the bubble must stay above (the Dock)
  figure?: FigureBounds;
  onDismiss: () => void;
}) {
  const reduced = useReducedMotion();
  const ref = useLiquidGlass<HTMLDivElement>({ radius: 16, bezel: 10, strength: 0.6, blur: 4, brightness: 0.85, tint: 0.32, press: "glow" });

  // Beside the head (the top ~third of the sprite), on whichever side
  // has more room, narrowing to fit (a phone has ~240px either way).
  const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
  const headRight = anchor.left + anchor.size * figure.right;
  const roomRight = vw - 12 - (headRight + GAP);
  const roomLeft = anchor.left + anchor.size * figure.left - GAP - 12;
  const onRight = roomRight >= MAX_WIDTH || roomRight >= roomLeft;
  const maxWidth = Math.min(MAX_WIDTH, onRight ? roomRight : roomLeft);
  // Low on the screen (home, by the Dock): grow upward from beside the
  // head, never dipping below `floor`. High (perched on a window): hang
  // down from beside the head.
  const vh = typeof window !== "undefined" ? window.innerHeight : 900;
  const low = anchor.top > vh / 2;
  const vertical = low
    ? { bottom: Math.max(floor, vh - (anchor.top + anchor.size * 0.5)) }
    : { top: Math.max(30, anchor.top + anchor.size * 0.12) };
  const horizontal = onRight
    ? { left: headRight + GAP }
    : { right: vw - (anchor.left + anchor.size * figure.left) + GAP };

  return (
    <motion.div
      ref={ref}
      role="status"
      aria-live="polite"
      className="liquid-glass"
      onClick={onDismiss}
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
      transition={{ type: "spring", visualDuration: 0.3, bounce: 0.25 }}
      style={{
        position: "fixed",
        ...vertical,
        ...horizontal,
        maxWidth,
        padding: "9px 13px",
        borderRadius: 16,
        transformOrigin: onRight ? "0% 30%" : "100% 30%",
        color: "var(--text-primary)",
        fontSize: 13,
        lineHeight: 1.35,
        fontWeight: 500,
        letterSpacing: "-0.005em",
        cursor: "pointer",
        zIndex,
      }}
    >
      {text}
    </motion.div>
  );
}
