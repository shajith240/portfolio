"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

const BOOT_DURATION_MS = 2200;

/* Stage 1 — full black screen, monogram + progress bar, matching real
   macOS's boot screen exactly except the logo (no Apple trademark —
   an original geometric "S" monogram instead). Click anywhere skips
   straight to the login screen. */

export default function BootScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, BOOT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      onClick={onComplete}
      style={{
        position: "fixed",
        inset: 0,
        background: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: "pointer",
      }}
    >
      {/* Monogram — sits ~40% down the viewport, matching real macOS's
          logo position (slightly above center, not dead-center). */}
      <div style={{ flex: "0 0 40vh" }} />

      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path
          d="M34 14C34 10 30 8 24 8C17 8 13 11 13 15.5C13 20 17 21.5 24 23C31 24.5 35 26.5 35 32C35 37 30 40 24 40C17 40 13 37 13 33"
          stroke="#FF4500"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>

      <div style={{ flex: 1 }} />

      {/* Progress bar */}
      <div
        style={{
          width: "200px",
          height: "4px",
          borderRadius: "2px",
          background: "rgba(255, 255, 255, 0.15)",
          overflow: "hidden",
          marginBottom: "12vh",
        }}
      >
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: BOOT_DURATION_MS / 1000, ease: "easeOut" }}
          style={{ height: "100%", background: "#FFFFFF", borderRadius: "2px" }}
        />
      </div>
    </div>
  );
}
