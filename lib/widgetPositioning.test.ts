import assert from "node:assert/strict";
import {
  spanForSize,
  computeGridSpec,
  cellRect,
  clampCell,
  pointToCell,
  cellsOverlap,
  resolveCellCollision,
  type GridSpec,
  type Cell,
  type Span,
  type Occupancy,
} from "./widgetPositioning.ts";
import { WIDGET_UNIT, WIDGET_GAP, CELL_STRIDE, DESKTOP_MARGIN } from "./widgetGrid.ts";

// spanForSize — small 1×1, medium 2×1, large 2×2
assert.deepEqual(spanForSize("small"), { cols: 1, rows: 1 });
assert.deepEqual(spanForSize("medium"), { cols: 2, rows: 1 });
assert.deepEqual(spanForSize("large"), { cols: 2, rows: 2 });

// computeGridSpec — 1440×900 viewport with topBound 40, bottomReserve 110
// usableWidth = 1440 - 48 = 1392
// cols = floor((1392 + 14) / 184) = floor(1406 / 184) = 7
// latticeWidth = 7 * 184 - 14 = 1288 - 14 = 1274
// originX = round((1440 - 1274) / 2) = round(166 / 2) = round(83) = 83
// originY = 40 + 24 = 64
// usableHeight = 900 - 110 - 64 - 24 = 702
// rows = floor((702 + 14) / 184) = floor(716 / 184) = floor(3.89) = 3
const spec = computeGridSpec(1440, 900, 40, 110);
assert.equal(spec.originX, 83);
assert.equal(spec.originY, 64);
assert.equal(spec.cols, 7);
assert.equal(spec.rows, 3);

// cellRect — cell {0,0} span 1×1
// x = 83 + 0 * 184 = 83
// y = 64 + 0 * 184 = 64
// width = 1 * 184 - 14 = 170
// height = 1 * 184 - 14 = 170
const rect1x1 = cellRect(spec, { col: 0, row: 0 }, { cols: 1, rows: 1 });
assert.equal(rect1x1.x, 83);
assert.equal(rect1x1.y, 64);
assert.equal(rect1x1.width, 170);
assert.equal(rect1x1.height, 170);

// cellRect — cell {0,0} span 2×1 (medium)
// width = 2 * 184 - 14 = 354
// height = 1 * 184 - 14 = 170
const rect2x1 = cellRect(spec, { col: 0, row: 0 }, { cols: 2, rows: 1 });
assert.equal(rect2x1.x, 83);
assert.equal(rect2x1.y, 64);
assert.equal(rect2x1.width, 354);
assert.equal(rect2x1.height, 170);

// cellRect — cell {0,0} span 2×2 (large)
// width = 2 * 184 - 14 = 354
// height = 2 * 184 - 14 = 354
const rect2x2 = cellRect(spec, { col: 0, row: 0 }, { cols: 2, rows: 2 });
assert.equal(rect2x2.x, 83);
assert.equal(rect2x2.y, 64);
assert.equal(rect2x2.width, 354);
assert.equal(rect2x2.height, 354);

// cellRect — cell {1,1} 1×1
// x = 83 + 1 * 184 = 267
// y = 64 + 1 * 184 = 248
const rect1x1_1_1 = cellRect(spec, { col: 1, row: 1 }, { cols: 1, rows: 1 });
assert.equal(rect1x1_1_1.x, 267);
assert.equal(rect1x1_1_1.y, 248);
assert.equal(rect1x1_1_1.width, 170);
assert.equal(rect1x1_1_1.height, 170);

// clampCell — cell within bounds stays as-is
const clampedIn = clampCell(spec, { col: 2, row: 1 }, { cols: 1, rows: 1 });
assert.deepEqual(clampedIn, { col: 2, row: 1 });

// clampCell — cell exceeding cols is clamped
const clampedCol = clampCell(spec, { col: 10, row: 0 }, { cols: 1, rows: 1 });
assert.equal(clampedCol.col, 6); // max col for 1-wide span in 7-col lattice

// clampCell — cell exceeding rows is clamped
const clampedRow = clampCell(spec, { col: 0, row: 10 }, { cols: 1, rows: 1 });
assert.equal(clampedRow.row, 2); // max row for 1-tall span in 3-row lattice

// clampCell — 2×2 span can only fit in cols 0-5, rows 0-1
const clamp2x2 = clampCell(spec, { col: 6, row: 2 }, { cols: 2, rows: 2 });
assert.equal(clamp2x2.col, 5); // max col for 2-wide span
assert.equal(clamp2x2.row, 1); // max row for 2-tall span

// pointToCell — pixel position rounds to nearest cell and clamps
// Point at spec.originX (83 pixels) → col 0
const cellFromOrigin = pointToCell(spec, 83, 64, { cols: 1, rows: 1 });
assert.deepEqual(cellFromOrigin, { col: 0, row: 0 });

// pointToCell — point at originX + CELL_STRIDE (83 + 184 = 267) → col 1
const cellCol1 = pointToCell(spec, 267, 64, { cols: 1, rows: 1 });
assert.deepEqual(cellCol1, { col: 1, row: 0 });

// pointToCell — point roughly midway between two cells → rounds to nearest
// Midway between col 0 (83) and col 1 (267) is at 175
// Distance to col 0: |175 - 83| = 92, distance to col 1: |175 - 267| = 92 (tie)
// Math.round will go to nearest even or first, verify actual behavior
const midpoint = pointToCell(spec, 175, 64, { cols: 1, rows: 1 });
assert(midpoint.col === 0 || midpoint.col === 1); // both are equally valid

// cellsOverlap — adjacent cells do not overlap (1×1 each)
const adjacent1 = { col: 0, row: 0 };
const adjacent2 = { col: 1, row: 0 };
assert.equal(cellsOverlap(adjacent1, { cols: 1, rows: 1 }, adjacent2, { cols: 1, rows: 1 }), false);

// cellsOverlap — same cell overlaps
const same = { col: 0, row: 0 };
assert.equal(cellsOverlap(same, { cols: 1, rows: 1 }, same, { cols: 1, rows: 1 }), true);

// cellsOverlap — a 2×2 at {0,0} overlaps a 1×1 at {1,1}
// 2×2 at {0,0} covers cols [0,2), rows [0,2)
// 1×1 at {1,1} covers cols [1,2), rows [1,2)
// They overlap in cols [1,2) and rows [1,2)
const large2x2 = { col: 0, row: 0 };
const small1x1_offset = { col: 1, row: 1 };
assert.equal(cellsOverlap(large2x2, { cols: 2, rows: 2 }, small1x1_offset, { cols: 1, rows: 1 }), true);

// cellsOverlap — a 2×2 at {0,0} does not overlap a 1×1 at {2,0}
// 2×2 covers cols [0,2), rows [0,2)
// 1×1 at {2,0} covers cols [2,3), rows [0,1) — no overlap in col dimension
assert.equal(cellsOverlap(large2x2, { cols: 2, rows: 2 }, { col: 2, row: 0 }, { cols: 1, rows: 1 }), false);

// resolveCellCollision — desired cell is free, return it
const occupied1: Occupancy[] = [{ cell: { col: 0, row: 0 }, span: { cols: 1, rows: 1 } }];
const resolved1 = resolveCellCollision(spec, { col: 3, row: 2 }, { cols: 1, rows: 1 }, occupied1);
assert.deepEqual(resolved1, { col: 3, row: 2 });

// resolveCellCollision — desired cell is occupied, resolve to nearest free
// Occupied: 1×1 at {0,0}
// Desired: {0,0} (occupied)
// Should resolve to a nearby free cell
const occupied2: Occupancy[] = [{ cell: { col: 0, row: 0 }, span: { cols: 1, rows: 1 } }];
const resolved2 = resolveCellCollision(spec, { col: 0, row: 0 }, { cols: 1, rows: 1 }, occupied2);
// The returned cell should be free (not overlapping with occupied)
assert.equal(cellsOverlap(resolved2, { cols: 1, rows: 1 }, { col: 0, row: 0 }, { cols: 1, rows: 1 }), false);
// Should not be the same as occupied
assert(resolved2.col !== 0 || resolved2.row !== 0, "Resolved cell should be different from occupied cell");

// resolveCellCollision — when desired is out of range, clamp then resolve
const occupied3: Occupancy[] = [{ cell: { col: 6, row: 2 }, span: { cols: 1, rows: 1 } }];
const outOfRange = { col: 100, row: 100 }; // way out of bounds
const resolved3 = resolveCellCollision(spec, outOfRange, { cols: 1, rows: 1 }, occupied3);
// Should be clamped to within bounds
assert(resolved3.col <= spec.cols - 1);
assert(resolved3.row <= spec.rows - 1);
// And should not overlap the occupied cell
assert.equal(cellsOverlap(resolved3, { cols: 1, rows: 1 }, { col: 6, row: 2 }, { cols: 1, rows: 1 }), false);

console.log("widgetPositioning: all assertions passed");
