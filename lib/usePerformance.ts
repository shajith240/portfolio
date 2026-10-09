"use client";

import { useState, useEffect, useMemo } from "react";

interface PerformanceTier {
  /** User prefers reduced motion (OS-level setting) */
  reducedMotion: boolean;
  /** Device has low RAM / few cores — simplify animations */
  isLowEnd: boolean;
  /** Tier: "full" = all effects, "reduced" = simpler springs, "minimal" = no blur/springs */
  tier: "full" | "reduced" | "minimal";
}

/**
 * Detects device performance capabilities and motion preferences.
 * - "full": all animations, backdrop-filter, springs
 * - "reduced": simpler springs (tweens), lower blur radius
 * - "minimal": prefers-reduced-motion OR very low-end — no springs, no blur, instant transitions
 */
export function usePerformance(): PerformanceTier {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isLowEnd, setIsLowEnd] = useState(false);

  useEffect(() => {
    // Reduced motion preference
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);

    // Low-end detection
    const nav = navigator as unknown as Record<string, unknown>;
    const memory = typeof nav.deviceMemory === "number" ? nav.deviceMemory : 8;
    const cores = typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : 8;
    setIsLowEnd(memory < 4 || cores < 4);

    return () => mq.removeEventListener("change", handler);
  }, []);

  const tier = useMemo<PerformanceTier["tier"]>(() => {
    if (reducedMotion) return "minimal";
    if (isLowEnd) return "reduced";
    return "full";
  }, [reducedMotion, isLowEnd]);

  return { reducedMotion, isLowEnd, tier };
}
