"use client";

import { useShellMetrics } from "@/lib/useShellMetrics";

/* Single positioning owner for the home-screen widget column. Replaces
   each widget computing its own `position: fixed; top: ...px` via
   hardcoded pixel math (the old AboutWidget redeclared a
   PHOTO_WIDGET_HEIGHT constant just to know where PhotoWidget ended —
   a copy, not an import, that could silently drift). Widgets rendered
   inside this are normal flow children; the gap and stacking order
   come from flexbox, not per-widget math. */

export default function DesktopWidgetStack({ children }: { children: React.ReactNode }) {
  const metrics = useShellMetrics();

  return (
    <div
      style={{
        position: "fixed",
        top: `${metrics.inset + 40}px`,
        left: `${metrics.inset}px`,
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
