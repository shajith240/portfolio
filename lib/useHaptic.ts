"use client";

import { useCallback } from "react";

/**
 * Mobile haptic feedback — replaces audio click on touch devices.
 *
 * Uses the Vibration API (Android Chrome/Firefox/Edge).
 * iOS Safari doesn't support it, but Framer Motion whileTap
 * scale animations already give tactile visual feedback there.
 *
 * Patterns tuned to Apple Taptic Engine feel:
 * - "light"   — 8ms pulse  (tab switch, toggle)
 * - "medium"  — 15ms pulse (sheet open, confirm)
 * - "heavy"   — [10, 30, 15]  (error, destructive action)
 */

type HapticStyle = "light" | "medium" | "heavy";

const PATTERNS: Record<HapticStyle, number | number[]> = {
  light: 8,
  medium: 15,
  heavy: [10, 30, 15],
};

export function useHaptic() {
  const trigger = useCallback((style: HapticStyle = "light") => {
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(PATTERNS[style]);
      }
    } catch {
      // Haptics are enhancement only — never break the UI
    }
  }, []);

  return trigger;
}
