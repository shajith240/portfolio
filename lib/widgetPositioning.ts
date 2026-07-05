import { WIDGET_GAP, CELL_STRIDE, DESKTOP_MARGIN } from "./widgetGrid.ts";
import type { WidgetSize } from "./widgetSizeTiers.ts";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// The desktop widget lattice — the macOS placement model. Cells are
// WIDGET_UNIT squares separated by WIDGET_GAP gutters; the lattice is
// horizontally centered in the viewport (equal margins both sides —
// the symmetry is the point) and top-anchored just below the MenuBar
// clearance. Widgets occupy whole cells and can only rest on cells.
export interface GridSpec {
  originX: number;
  originY: number;
  cols: number;
  rows: number;
}

export interface Cell {
  col: number;
  row: number;
}

export interface Span {
  cols: number;
  rows: number;
}

export interface Occupancy {
  cell: Cell;
  span: Span;
}

// small 1×1, medium 2×1, large 2×2 — the tier family expressed in
// cells (170 / 354 = 2×170+14 fall out of these spans exactly).
export function spanForSize(size: WidgetSize): Span {
  if (size === "small") return { cols: 1, rows: 1 };
  if (size === "medium") return { cols: 2, rows: 1 };
  return { cols: 2, rows: 2 };
}

// topBound/bottomReserve are the MenuBar/Dock clearance lines; the
// lattice additionally insets DESKTOP_MARGIN from every edge so no
// widget can ever kiss a screen edge.
export function computeGridSpec(
  viewportWidth: number,
  viewportHeight: number,
  topBound: number,
  bottomReserve: number
): GridSpec {
  const usableWidth = viewportWidth - DESKTOP_MARGIN * 2;
  const cols = Math.max(2, Math.floor((usableWidth + WIDGET_GAP) / CELL_STRIDE));
  const latticeWidth = cols * CELL_STRIDE - WIDGET_GAP;
  const originX = Math.round((viewportWidth - latticeWidth) / 2);

  const originY = topBound + DESKTOP_MARGIN;
  const usableHeight = viewportHeight - bottomReserve - originY - DESKTOP_MARGIN;
  const rows = Math.max(2, Math.floor((usableHeight + WIDGET_GAP) / CELL_STRIDE));
  return { originX, originY, cols, rows };
}

export function cellRect(spec: GridSpec, cell: Cell, span: Span): Rect {
  return {
    x: spec.originX + cell.col * CELL_STRIDE,
    y: spec.originY + cell.row * CELL_STRIDE,
    width: span.cols * CELL_STRIDE - WIDGET_GAP,
    height: span.rows * CELL_STRIDE - WIDGET_GAP,
  };
}

export function clampCell(spec: GridSpec, cell: Cell, span: Span): Cell {
  return {
    col: Math.min(Math.max(cell.col, 0), Math.max(0, spec.cols - span.cols)),
    row: Math.min(Math.max(cell.row, 0), Math.max(0, spec.rows - span.rows)),
  };
}

// Nearest cell for a live pixel position (a mid-drag widget corner).
export function pointToCell(spec: GridSpec, x: number, y: number, span: Span): Cell {
  return clampCell(
    spec,
    {
      col: Math.round((x - spec.originX) / CELL_STRIDE),
      row: Math.round((y - spec.originY) / CELL_STRIDE),
    },
    span
  );
}

export function cellsOverlap(a: Cell, aSpan: Span, b: Cell, bSpan: Span): boolean {
  return (
    a.col < b.col + bSpan.cols &&
    a.col + aSpan.cols > b.col &&
    a.row < b.row + bSpan.rows &&
    a.row + aSpan.rows > b.row
  );
}

// Widgets never layer: if the desired cell region is occupied, the
// nearest free cell (euclidean distance in cell space) wins. The
// primary search stays within the lattice's official row/col count;
// if that's genuinely full (a short/narrow viewport plus several
// widgets can fill every official cell), the search continues into
// rows below the lattice's bottom edge rather than ever returning an
// occupied cell — a widget parked slightly past the nominal desktop
// height is still a widget you can see and drag back up; an
// overlapping widget is a broken layout. Column count never extends
// (widening sideways isn't how macOS desktops grow), only rows.
export function resolveCellCollision(spec: GridSpec, desired: Cell, span: Span, occupied: Occupancy[]): Cell {
  const target = clampCell(spec, desired, span);
  const isFree = (cell: Cell) => occupied.every((o) => !cellsOverlap(cell, span, o.cell, o.span));
  if (isFree(target)) return target;

  // Generous upper bound: every occupied widget's rows plus this
  // widget's own span plus one full lattice height of slack — always
  // enough rows to guarantee at least one free cell exists somewhere
  // in [0, maxRow], however crowded the occupied list is.
  const maxRow = spec.rows + occupied.length * 2 + span.rows;

  let best: Cell | null = null;
  let bestDist = Infinity;
  for (let col = 0; col <= Math.max(0, spec.cols - span.cols); col++) {
    for (let row = 0; row <= maxRow; row++) {
      const cell = { col, row };
      if (!isFree(cell)) continue;
      const dist = Math.hypot(col - target.col, row - target.row);
      if (dist < bestDist) {
        bestDist = dist;
        best = cell;
      }
    }
  }
  // best is guaranteed non-null: row = maxRow alone (with occupied.length
  // entries, each spanning at most a few rows) always clears every
  // occupied span for at least one column.
  return best ?? target;
}
