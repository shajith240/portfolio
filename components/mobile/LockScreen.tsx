"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import IOSStatusBar from "@/components/mobile/IOSStatusBar";

/* iPhone lock screen — iOS 26 anatomy. The clock is the element
   every visitor recognizes, so it gets the full treatment: the
   modern MASSIVE near-full-width digits (per the iOS 26 reference,
   not the old 96pt style), rendered as a vertical white gradient
   clipped to the glyphs so they read as dimensional glass over the
   wallpaper rather than flat white paint. Date reads "Sun Oct 5"
   above it. Bottom: flashlight/camera Liquid Glass circles + home
   indicator + the "Swipe up to open" affordance iOS itself shows.

   Unlock: swipe up (pointer tracking, -60px threshold with a light
   parallax follow while dragging); the screen departs upward and
   AnimatePresence in IPhoneShell plays the exit. */

const GLASS_BUTTON: React.CSSProperties = {
  width: "52px",
  height: "52px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(60, 60, 66, 0.42)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  border: "none",
  boxShadow: "inset 0 1px 1px rgba(255,255,255,0.22), inset 0 -1px 2px rgba(0,0,0,0.25)",
};

const FlashlightGlyph = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M9 2h6v3l-2 4v11a1.5 1.5 0 0 1-3 0V9L8 5V2h1Z" fill="rgba(255,255,255,0.95)" transform="translate(0.5 1)" />
  </svg>
);

const CameraGlyph = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="6" width="20" height="14" rx="3" fill="rgba(255,255,255,0.95)" />
    <path d="M8 6l1.5-2.5h5L16 6" stroke="rgba(255,255,255,0.95)" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="12" cy="13" r="4" fill="rgba(30,30,32,0.9)" />
  </svg>
);

export default function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [now, setNow] = useState<Date | null>(null);
  const dragStartY = useRef<number | null>(null);
  const y = useMotionValue(0);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 5_000);
    return () => clearInterval(id);
  }, []);

  const date = now
    ? `${now.toLocaleDateString("en-US", { weekday: "short" })} ${now.toLocaleDateString("en-US", { month: "short" })} ${now.getDate()}`
    : "";
  // Big clock is h:mm, 12-hour, no AM/PM — exactly the lock format.
  const clock = now
    ? now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?[AP]M/, "")
    : "";

  return (
    <motion.div
      exit={{ y: "-100%", opacity: 0.6 }}
      transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
      onPointerDown={(e) => {
        dragStartY.current = e.clientY;
      }}
      onPointerMove={(e) => {
        if (dragStartY.current === null) return;
        // Light parallax follow — content tracks the finger at half
        // speed while dragging up, like the real lock screen.
        const delta = e.clientY - dragStartY.current;
        if (delta < 0) y.set(delta * 0.5);
      }}
      onPointerUp={(e) => {
        const start = dragStartY.current;
        dragStartY.current = null;
        if (start !== null && start - e.clientY > 60) {
          onUnlock();
        } else {
          y.set(0);
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 800,
        touchAction: "none",
        userSelect: "none",
        // Faint scrim so the white type always survives bright wallpapers.
        background: "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.02) 40%, rgba(0,0,0,0.22) 100%)",
      }}
    >
      <IOSStatusBar variant="lock" />

      <motion.div style={{ y, position: "absolute", inset: 0, pointerEvents: "none" }}>
        {/* Date + clock block */}
        <div style={{ position: "absolute", top: "76px", left: 0, right: 0, textAlign: "center" }}>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.95)",
              letterSpacing: "-0.01em",
              marginBottom: "-6px",
              textShadow: "0 1px 12px rgba(0,0,0,0.25)",
            }}
          >
            {date}
          </div>
          <div
            style={{
              fontSize: "min(46vw, 178px)",
              fontWeight: 700,
              lineHeight: 1.0,
              letterSpacing: "-0.045em",
              fontVariantNumeric: "tabular-nums",
              // Gradient-clipped digits: brighter at the crown,
              // settling lower — the dimensional iOS 26 clock, not
              // flat white paint.
              backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(255,255,255,0.78) 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              filter: "drop-shadow(0 2px 18px rgba(0,0,0,0.18))",
            }}
          >
            {clock}
          </div>
        </div>
      </motion.div>

      {/* Flashlight / camera */}
      <div
        style={{
          position: "absolute",
          bottom: "68px",
          left: "46px",
          right: "46px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <motion.button whileTap={{ scale: 0.88 }} style={GLASS_BUTTON} aria-label="Flashlight">
          <FlashlightGlyph />
        </motion.button>
        <motion.button whileTap={{ scale: 0.88 }} style={GLASS_BUTTON} aria-label="Camera">
          <CameraGlyph />
        </motion.button>
      </div>

      {/* Swipe affordance + home indicator — iOS shows this exact
          text on the lock screen when it wants a swipe. */}
      <div style={{ position: "absolute", bottom: "30px", left: 0, right: 0, textAlign: "center" }}>
        <motion.div
          animate={{ opacity: [0.55, 0.95, 0.55] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.85)" }}
        >
          Swipe up to open
        </motion.div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "8px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "135px",
          height: "5px",
          borderRadius: "10px",
          background: "rgba(255,255,255,0.55)",
        }}
      />
    </motion.div>
  );
}
