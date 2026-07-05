"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

// macOS boot sequence: bar completes in ~2.5s, fade-out after
const BAR_DURATION_MS = 2500;
const FADE_DELAY_MS = BAR_DURATION_MS;
const FADE_DURATION_MS = 400;
const TOTAL_DURATION_MS = BAR_DURATION_MS + FADE_DURATION_MS;

/* Stage 1 — macOS boot screen exact replica:
   - Pure black background
   - White monogram, ~90px tall, centered ~42% from top (slightly above center)
   - Progress bar below: width 220px, height 5px, borderRadius 2.5px
     track rgba(255,255,255,0.25), fill #fff
   - Bar fill pattern: 0→30% in 0.4s, 30→65% in 1.2s, pause 0.4s, 65→100% in 0.5s
   - Fade entire boot layer out 0.4s ease after bar completes
   - Click anywhere skips to next screen (preserved from original)
*/

export default function BootScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, TOTAL_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      onClick={onComplete}
      style={{
        position: "fixed",
        inset: 0,
        background: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{
        delay: FADE_DELAY_MS / 1000,
        duration: FADE_DURATION_MS / 1000,
        ease: "easeOut",
      }}
    >
      {/* Monogram container — positioned 42% from top (slightly above center) */}
      <div style={{ position: "absolute", top: "42%" }}>
        {/* White monogram, ~90px tall */}
        <svg width="90" height="90" viewBox="0 0 48 48" fill="none">
          <path
            d="M34 14C34 10 30 8 24 8C17 8 13 11 13 15.5C13 20 17 21.5 24 23C31 24.5 35 26.5 35 32C35 37 30 40 24 40C17 40 13 37 13 33"
            stroke="#FFFFFF"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Progress bar — positioned 12% of viewport below the mark */}
      <div
        style={{
          position: "absolute",
          top: "calc(42% + 90px + 12vh)",
          width: "220px",
          height: "5px",
          borderRadius: "2.5px",
          background: "rgba(255, 255, 255, 0.25)",
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ width: "0%" }}
          animate={{
            width: ["0%", "30%", "65%", "65%", "100%"],
          }}
          transition={{
            // Keyframe times: t=0, t=0.4s, t=1.6s, t=2.0s, t=2.5s
            // Normalized: 0/2.5=0, 0.4/2.5≈0.16, 1.6/2.5=0.64, 2.0/2.5=0.8, 2.5/2.5=1
            times: [0, 0.16, 0.64, 0.8, 1],
            duration: BAR_DURATION_MS / 1000,
            ease: "easeInOut",
          }}
          style={{
            height: "100%",
            background: "#FFFFFF",
            borderRadius: "2.5px",
          }}
        />
      </div>
    </motion.div>
  );
}
