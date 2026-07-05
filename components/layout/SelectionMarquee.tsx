"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface MarqueeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface SelectionMarqueeProps {
  desktopRef: React.RefObject<HTMLDivElement | null>;
}

export default function SelectionMarquee({ desktopRef }: SelectionMarqueeProps) {
  const [marquee, setMarquee] = useState<MarqueeState | null>(null);

  useEffect(() => {
    if (!desktopRef.current) return;

    const desktop = desktopRef.current;

    const handlePointerDown = (e: PointerEvent) => {
      // Only start on the desktop element itself, not on widgets/windows/menus
      if (e.target !== desktop) return;
      // Only left mouse button (button 0)
      if (e.button !== 0) return;

      setMarquee({
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
      });
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!marquee) return;

      setMarquee((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentX: e.clientX,
          currentY: e.clientY,
        };
      });
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!marquee) return;

      // Calculate distance moved
      const dx = marquee.currentX - marquee.startX;
      const dy = marquee.currentY - marquee.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If moved less than 4px, treat as a click (no marquee display)
      if (distance < 4) {
        setMarquee(null);
        return;
      }

      // Otherwise, clear the marquee (with fade animation handled by AnimatePresence)
      setMarquee(null);
    };

    desktop.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);

    return () => {
      desktop.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [marquee, desktopRef]);

  // Calculate normalized rectangle (top-left, bottom-right)
  const getRect = () => {
    if (!marquee) return null;

    const x1 = Math.min(marquee.startX, marquee.currentX);
    const y1 = Math.min(marquee.startY, marquee.currentY);
    const x2 = Math.max(marquee.startX, marquee.currentX);
    const y2 = Math.max(marquee.startY, marquee.currentY);

    return {
      left: x1,
      top: y1,
      width: x2 - x1,
      height: y2 - y1,
    };
  };

  const rect = getRect();

  return (
    <AnimatePresence>
      {marquee && rect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.08 }}
          aria-hidden
          style={{
            position: "fixed",
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            background: "rgba(10, 132, 255, 0.14)",
            border: "1px solid rgba(10, 132, 255, 0.55)",
            borderRadius: 0,
            pointerEvents: "none",
            zIndex: 5,
          }}
        />
      )}
    </AnimatePresence>
  );
}
