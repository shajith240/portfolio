/* Single source of truth for desktop widget geometry — Apple's real
   widget grid system, not per-widget ad-hoc sizes.

   macOS desktop widgets use one universal size family shared by every
   widget: small is a square, medium is exactly two smalls plus one
   gutter wide (same height as small), large is a square with medium's
   width. Individual widgets NEVER define their own dimensions — they
   adapt their content to the family's fixed frames.

   Placement is a strict CELL LATTICE, exactly like the macOS desktop:
   the desktop is divided into WIDGET_UNIT-sized cells separated by
   WIDGET_GAP gutters, inset from every screen edge by DESKTOP_MARGIN.
   A widget occupies whole cells (small 1×1, medium 2×1, large 2×2)
   and can only ever rest on a cell — that single invariant is what
   produces Apple's "perfect fit" look: every edge on the desktop
   lines up with every other edge by construction, overlap is
   structurally impossible, and nothing can be parked half off-grid.

   WIDGET_UNIT 170 / WIDGET_GAP 14 mirror macOS desktop's own metrics
   (small 170×170pt, medium 354×170pt, large 354×354pt ⇒ the gutter
   implied by medium's width is 354 − 2×170 = 14pt). */

export const WIDGET_UNIT = 170;
export const WIDGET_GAP = 14;
export const WIDGET_MEDIUM_WIDTH = WIDGET_UNIT * 2 + WIDGET_GAP; // 354
export const WIDGET_PADDING = 16;
export const WIDGET_RADIUS = 22;

// Minimum clearance between any widget and the usable desktop's
// edges (viewport sides, MenuBar line, Dock line) — the "border
// padding" that keeps widgets from kissing the screen edge.
export const DESKTOP_MARGIN = 24;

// Distance from one cell's origin to the next.
export const CELL_STRIDE = WIDGET_UNIT + WIDGET_GAP; // 184
