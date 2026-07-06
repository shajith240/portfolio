"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import BootScreen from "@/components/boot/BootScreen";

const SESSION_KEY = "portfolio.bootSeen";

/* Boot only — the click-to-continue LoginScreen stage was removed
   (per request): the enhanced boot progress plays and hands off
   STRAIGHT to the desktop. Defaults to "boot" (matches the server's
   render — no hydration mismatch), then a mount-time effect jumps
   straight to "done" if this session has already seen it. Biased
   toward correctly showing the sequence on a first visit rather than
   risking a flash of the desktop first. */

export default function BootSequence() {
  const [stage, setStage] = useState<"boot" | "done">("boot");

  useEffect(() => {
    if (window.sessionStorage.getItem(SESSION_KEY)) {
      setStage("done");
    }
  }, []);

  const handleBootComplete = useCallback(() => {
    window.sessionStorage.setItem(SESSION_KEY, "1");
    setStage("done");
  }, []);

  if (stage === "done") return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
      <AnimatePresence>
        {stage === "boot" && <BootScreen key="boot" onComplete={handleBootComplete} />}
      </AnimatePresence>
    </div>
  );
}
