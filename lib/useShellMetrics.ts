"use client";

import { useLayout } from "@/contexts/LayoutContext";

const clamp = (min: number, preferred: number, max: number) =>
  Math.min(max, Math.max(min, preferred));

export function calculateShellMetrics(viewportWidth = 1440, viewportHeight = 900) {
  const width = Math.max(320, viewportWidth || 1440);
  const height = Math.max(320, viewportHeight || 900);
  const inset = clamp(12, width * 0.0108, 20);
  const gap = clamp(10, width * 0.0086, 16);

  return {
    viewportWidth: width,
    viewportHeight: height,
    inset,
    gap,
  };
}

export function useShellMetrics() {
  const layout = useLayout();
  const metrics = calculateShellMetrics(layout.viewportWidth, layout.viewportHeight);
  const isPhone = layout.isMobileLayout && !layout.isTabletLayout;

  return {
    ...metrics,
    isPhone,
    // No sidebar reserves space anymore — every page gets a plain,
    // symmetric inset margin on both sides.
    contentLeft: metrics.inset,
    contentRight: metrics.inset,
    toolbarLeft: metrics.inset,
    toolbarRight: metrics.inset,
    dotsLeft: 8,
  };
}
