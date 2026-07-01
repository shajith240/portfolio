"use client";

import { useLayout } from "@/contexts/LayoutContext";

const clamp = (min: number, preferred: number, max: number) =>
  Math.min(max, Math.max(min, preferred));

export function calculateShellMetrics(viewportWidth = 1440, viewportHeight = 900) {
  const width = Math.max(320, viewportWidth || 1440);
  const height = Math.max(320, viewportHeight || 900);
  const inset = clamp(12, width * 0.0108, 20);
  const gap = clamp(10, width * 0.0086, 16);
  const sidebarWidth = clamp(300, width * 0.19, 360);
  const navWidth = clamp(360, width * 0.23, 480);
  const sidebarRightEdge = inset + sidebarWidth;
  const navFromRightEdge = inset + navWidth;

  return {
    viewportWidth: width,
    viewportHeight: height,
    inset,
    gap,
    sidebarWidth,
    navWidth,
    sidebarRightEdge,
    navFromRightEdge,
    sidebarHiddenX: -(sidebarWidth + inset + 32),
    navHiddenX: navWidth + inset + 32,
  };
}

export function useShellMetrics() {
  const layout = useLayout();
  const metrics = calculateShellMetrics(layout.viewportWidth, layout.viewportHeight);
  const isPhone = layout.isMobileLayout && !layout.isTabletLayout;

  return {
    ...metrics,
    isPhone,
    contentLeft: !layout.isMobileLayout && layout.isSidebarOpen
      ? metrics.sidebarRightEdge + metrics.gap
      : 0,
    contentRight: 0,
    toolbarLeft: !layout.isMobileLayout && layout.isSidebarOpen
      ? metrics.sidebarRightEdge + metrics.gap
      : 16,
    toolbarRight: 16,
    dotsLeft: !layout.isMobileLayout && layout.isSidebarOpen
      ? metrics.sidebarRightEdge + clamp(8, metrics.viewportWidth * 0.006, 12)
      : 8,
  };
}
