"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useLiquidGlass } from "@/lib/liquidGlass";

/* The small "Ask me" label beside the mascot at its home spot —
   the affordance that tells visitors the character can actually talk.
   A control-sized Liquid Glass surface (squish on press), its own fixed
   element like the bubble and chat, never inside the mascot's fading
   wrapper. */

export default function AskPill({ style, onOpen }: { style: React.CSSProperties; onOpen: () => void }) {
  const reduced = useReducedMotion();
  const ref = useLiquidGlass<HTMLButtonElement>({ radius: 13, bezel: 7, strength: 0.6, blur: 4, brightness: 0.85, tint: 0.3, press: "squish" });

  return (
    <motion.button
      ref={ref}
      type="button"
      className="liquid-glass"
      onClick={onOpen}
      aria-label="Chat with Shajith"
      initial={reduced ? { opacity: 0 } : { opacity: 0, x: 8 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ type: "spring", visualDuration: 0.35, bounce: 0.2 }}
      style={{
        position: "fixed",
        ...style,
        height: 26,
        padding: "0 10px",
        borderRadius: 13,
        border: "none",
        display: "flex",
        alignItems: "center",
        gap: 5,
        color: "var(--text-primary)",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "-0.005em",
        whiteSpace: "nowrap",
        cursor: "pointer",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M3 3.5h10a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H8l-3 2.5V11.5H3A1.5 1.5 0 0 1 1.5 10V5A1.5 1.5 0 0 1 3 3.5Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
      Ask me
    </motion.button>
  );
}
