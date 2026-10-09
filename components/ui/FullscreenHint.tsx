"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLiquidGlass } from "@/lib/liquidGlass";
import { MENU_BAR_HEIGHT } from "@/contexts/WindowManagerContext";

/* A quiet suggestion to go full screen — the desktop is built for the
   whole screen, and browser chrome eats into it. A small glass pill
   under the menu bar, a few seconds after load, once per visitor:
   "Go full screen" or ×. Never shown while already full screen, where
   the Fullscreen API is missing (e.g. iPhone Safari), or once
   dismissed. Exiting full screen later doesn't bring it back. */

const DISMISSED_KEY = "portfolio.fullscreenHint.dismissed";
const DELAY_MS = 4000;

function remember() {
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    /* private mode: it just shows again next visit */
  }
}

function Pill({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const lgRef = useLiquidGlass<HTMLDivElement>({ radius: 20, bezel: 10, strength: 0.6, blur: 5, brightness: 0.86, tint: 0.34, press: false });

  const goFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    onDone();
  };

  return (
    <motion.div
      ref={lgRef}
      className="liquid-glass"
      role="status"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={reduce ? { duration: 0.2 } : { type: "spring", stiffness: 380, damping: 32 }}
      style={{
        position: "fixed",
        top: MENU_BAR_HEIGHT + 12,
        left: "50%",
        x: "-50%",
        zIndex: 98,
        display: "flex",
        alignItems: "center",
        gap: 10,
        height: 40,
        padding: "0 6px 0 16px",
        borderRadius: 20,
        fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        fontSize: 13,
        color: "rgba(255, 255, 255, 0.88)",
        whiteSpace: "nowrap",
      }}
    >
      <span>Best viewed full screen</span>
      <button type="button" onClick={goFullscreen} className="fs-btn fs-btn-primary">
        Go full screen
      </button>
      <button type="button" onClick={onDone} className="fs-btn fs-btn-close" aria-label="Dismiss">
        ×
      </button>
    </motion.div>
  );
}

export default function FullscreenHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!document.fullscreenEnabled || document.fullscreenElement) return;
    try {
      if (localStorage.getItem(DISMISSED_KEY)) return;
    } catch {
      /* show it */
    }
    const t = setTimeout(() => {
      if (!document.fullscreenElement) setShow(true);
    }, DELAY_MS);
    // Went full screen some other way (F11, the green button): done.
    const onChange = () => {
      if (document.fullscreenElement) {
        remember();
        setShow(false);
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      clearTimeout(t);
      document.removeEventListener("fullscreenchange", onChange);
    };
  }, []);

  const done = () => {
    remember();
    setShow(false);
  };

  return <AnimatePresence>{show && <Pill onDone={done} />}</AnimatePresence>;
}
