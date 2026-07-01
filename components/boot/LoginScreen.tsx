"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useWallpaper } from "@/lib/useWallpaper";

const PLACEHOLDER_BG =
  "radial-gradient(ellipse 120% 90% at 30% 20%, #2a2a2e 0%, #17171a 55%, #0d0d0f 100%)";

/* Stage 2 — matches macOS Sonoma+'s actual login layout (corrected
   from the older "everything centered" assumption via research): a
   large clock top-center, the account picker compact at the bottom,
   full blurred wallpaper in between. See
   docs/superpowers/specs/2026-07-01-boot-login-sequence-design.md. */

function useLiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function LoginScreen({ onUnlock }: { onUnlock: () => void }) {
  const { wallpaper } = useWallpaper();
  const now = useLiveClock();
  const [pressed, setPressed] = useState(false);

  const timeLabel = now
    ? now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "";
  const dateLabel = now
    ? now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })
    : "";

  return (
    <motion.div
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      style={{ position: "fixed", inset: 0, overflow: "hidden" }}
    >
      {/* Blurred wallpaper background — same "blurred snapshot" look
          real macOS's login screen uses by default. */}
      <div
        style={{
          position: "absolute",
          inset: "-40px", // overscan so the blur doesn't reveal soft edges
          background: wallpaper ? `url(/wallpapers/${wallpaper}) center / cover no-repeat` : PLACEHOLDER_BG,
          filter: "blur(40px) saturate(120%)",
        }}
      />
      <div style={{ position: "absolute", inset: 0, background: "rgba(0, 0, 0, 0.25)" }} />

      {/* Clock — top-center, ~12% down */}
      <div
        style={{
          position: "absolute",
          top: "12%",
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: "clamp(64px, 9vw, 96px)",
            fontWeight: 200,
            color: "#FFFFFF",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            textShadow: "0 2px 20px rgba(0, 0, 0, 0.3)",
          }}
        >
          {timeLabel}
        </div>
        <div
          style={{
            fontSize: "clamp(15px, 1.6vw, 18px)",
            fontWeight: 500,
            color: "rgba(255, 255, 255, 0.85)",
            marginTop: "8px",
          }}
        >
          {dateLabel}
        </div>
      </div>

      {/* Account picker — bottom-center, ~14% up */}
      <div
        style={{
          position: "absolute",
          bottom: "14%",
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <motion.button
          onClick={onUnlock}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onMouseLeave={() => setPressed(false)}
          animate={{ scale: pressed ? 0.94 : 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            padding: 0,
            border: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
            cursor: "pointer",
            overflow: "hidden",
          }}
        >
          <img
            src="/photos/my_photo.jpeg"
            alt="Shajith"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 10%" }}
          />
        </motion.button>

        <span style={{ fontSize: "15px", fontWeight: 600, color: "#FFFFFF" }}>
          Shajith Bathina
        </span>

        <motion.span
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.7)" }}
        >
          Click to continue
        </motion.span>
      </div>
    </motion.div>
  );
}
