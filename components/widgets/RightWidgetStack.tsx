"use client";

import { useShellMetrics } from "@/lib/useShellMetrics";

/* Right-hand mirror of DesktopWidgetStack — same single-positioning-
   owner rationale, just anchored to the right edge instead of the
   left. Widgets rendered inside this are normal flow children; the
   gap and stacking order come from flexbox, not per-widget math.
   MotivationWidget is NOT part of this stack — it's bottom-anchored
   (mirroring the Dock) rather than top-anchored, a different anchor
   point entirely, so it stays independently positioned. */

export default function RightWidgetStack({ children }: { children: React.ReactNode }) {
  const metrics = useShellMetrics();

  return (
    <div
      style={{
        position: "fixed",
        top: `${metrics.inset + 40}px`,
        right: `${metrics.inset}px`,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      {children}
    </div>
  );
}
