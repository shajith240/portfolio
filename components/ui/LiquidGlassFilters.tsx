/* Global SVG defs for the enhanced-tier Liquid Glass refraction filter
   documented in docs/design-system/materials-glass.md. Mounted once
   near the root (see AppShell.tsx) so any component can reference
   #liquid-glass-refraction from a `backdrop-filter: url(...)` CSS rule
   — an SVG <filter> only needs to exist somewhere in the same
   document, not inside the element using it.

   The displacement map is a radial gradient (flat through the middle,
   brightening toward the edge) rendered to an offscreen <rect> and
   fed through feDisplacementMap: uniform color = zero displacement in
   the center, growing displacement toward the edges — real glass
   bends light most sharply near its own edge/curvature, not in the
   middle of a flat pane, so this reproduces that "thicker at the
   edges" lensing rather than a uniform full-surface warp.

   Chromium-only: Safari/Firefox don't accept SVG filters as a
   backdrop-filter input, so this silently does nothing there — see
   the @supports gate in globals.css that layers it on top of the
   baseline blur tier. */
export default function LiquidGlassFilters() {
  return (
    <svg aria-hidden focusable="false" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        <radialGradient id="liquid-glass-map-gradient" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#8080ff" />
          <stop offset="55%" stopColor="#8080ff" />
          <stop offset="100%" stopColor="#d8d0ff" />
        </radialGradient>
        <rect id="liquid-glass-map-source" width="100%" height="100%" fill="url(#liquid-glass-map-gradient)" />
        <filter id="liquid-glass-refraction" x="-20%" y="-20%" width="140%" height="140%">
          <feImage href="#liquid-glass-map-source" x="0" y="0" width="100%" height="100%" result="map" />
          <feGaussianBlur in="map" stdDeviation="8" result="blurredMap" />
          <feDisplacementMap in="SourceGraphic" in2="blurredMap" scale="20" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
