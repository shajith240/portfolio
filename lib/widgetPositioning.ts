export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface AlignmentGuide {
  axis: "x" | "y";
  position: number;
}

// Matches this codebase's own documented 8pt spacing scale
// (docs/design-system/layout.md) — every drag lands on this grid.
export const GRID_SIZE = 8;

// Distance (px) within which a dragged edge/center snaps to another
// widget's matching edge/center and renders a guide line — matches
// real macOS's own smart-alignment-guide feel.
export const GUIDE_THRESHOLD = 6;

export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export function clampToBounds(x: number, y: number, bounds: Bounds): { x: number; y: number } {
  return {
    x: Math.min(Math.max(x, bounds.minX), bounds.maxX),
    y: Math.min(Math.max(y, bounds.minY), bounds.maxY),
  };
}

function edgesX(r: Rect): number[] {
  return [r.x, r.x + r.width / 2, r.x + r.width];
}

function edgesY(r: Rect): number[] {
  return [r.y, r.y + r.height / 2, r.y + r.height];
}

// Compares the dragged rect's left/center/right (and top/center/
// bottom) against every other rect's same three lines. Whichever
// pair is closest — and under GUIDE_THRESHOLD — wins per axis; the
// dragged rect's position shifts by exactly the distance needed to
// align that pair, and a guide is reported at the aligned coordinate.
export function computeAlignmentSnap(
  dragged: Rect,
  others: Rect[]
): { x: number; y: number; guides: AlignmentGuide[] } {
  let snappedX = dragged.x;
  let bestXDist = GUIDE_THRESHOLD;
  let guideX: number | null = null;

  let snappedY = dragged.y;
  let bestYDist = GUIDE_THRESHOLD;
  let guideY: number | null = null;

  for (const other of others) {
    for (const dEdge of edgesX(dragged)) {
      for (const oEdge of edgesX(other)) {
        const dist = Math.abs(dEdge - oEdge);
        if (dist < bestXDist) {
          bestXDist = dist;
          snappedX = dragged.x + (oEdge - dEdge);
          guideX = oEdge;
        }
      }
    }
    for (const dEdge of edgesY(dragged)) {
      for (const oEdge of edgesY(other)) {
        const dist = Math.abs(dEdge - oEdge);
        if (dist < bestYDist) {
          bestYDist = dist;
          snappedY = dragged.y + (oEdge - dEdge);
          guideY = oEdge;
        }
      }
    }
  }

  const guides: AlignmentGuide[] = [];
  if (guideX !== null) guides.push({ axis: "x", position: guideX });
  if (guideY !== null) guides.push({ axis: "y", position: guideY });

  return { x: snappedX, y: snappedY, guides };
}
