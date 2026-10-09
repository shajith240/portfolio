import { cellRect, computeGridSpec, type Occupancy, type Rect } from "./widgetPositioning.ts";

/* The mascot's permanent home on the desktop: the top-left cell of the
   widget lattice (where the photo widget used to live), sized like a
   small widget so the framed figure reads as a "live photo" of
   Shajith. The widget grid treats this cell as permanently occupied —
   no widget can be dropped or resolved onto it.

   Uses the exact spec the widget system uses (computeGridSpec with the
   MenuBar/Dock clearance lines), so the frame lines up with the
   widgets on every screen size. */

export const MASCOT_OCCUPANCY: Occupancy = { cell: { col: 0, row: 0 }, span: { cols: 1, rows: 1 } };

export function mascotSlotRect(viewportWidth: number, viewportHeight: number, topBound: number, bottomReserve: number): Rect {
  const spec = computeGridSpec(viewportWidth, viewportHeight, topBound, bottomReserve);
  return cellRect(spec, MASCOT_OCCUPANCY.cell, MASCOT_OCCUPANCY.span);
}
