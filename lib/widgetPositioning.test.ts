import assert from "node:assert/strict";
import { snapToGrid, clampToBounds, computeAlignmentSnap, GUIDE_THRESHOLD } from "./widgetPositioning.ts";

// snapToGrid — 8px increments
assert.equal(snapToGrid(13), 16);
assert.equal(snapToGrid(11), 8);
assert.equal(snapToGrid(0), 0);

// clampToBounds
const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 200 };
assert.deepEqual(clampToBounds(-10, 50, bounds), { x: 0, y: 50 });
assert.deepEqual(clampToBounds(150, 250, bounds), { x: 100, y: 200 });
assert.deepEqual(clampToBounds(50, 50, bounds), { x: 50, y: 50 });

// computeAlignmentSnap — left edges align within threshold
const dragged = { x: 103, y: 300, width: 260, height: 176 };
const others = [{ x: 100, y: 0, width: 260, height: 260 }];
const result = computeAlignmentSnap(dragged, others);
assert.equal(result.x, 100); // snapped to other's left edge
assert.equal(result.guides.length, 1);
assert.equal(result.guides[0].axis, "x");
assert.equal(result.guides[0].position, 100);

// computeAlignmentSnap — nothing within threshold, no snap/no guides
const farDragged = { x: 500, y: 500, width: 260, height: 176 };
const farResult = computeAlignmentSnap(farDragged, others);
assert.equal(farResult.x, 500);
assert.equal(farResult.guides.length, 0);

// computeAlignmentSnap — center-to-center alignment
const centerDragged = { x: 100 + GUIDE_THRESHOLD - 1, y: 400, width: 260, height: 176 };
const centerOthers = [{ x: 100, y: 0, width: 260, height: 260 }]; // center x = 230
const centerResult = computeAlignmentSnap(centerDragged, centerOthers);
assert.equal(centerResult.x + 260 / 2, 230); // dragged's own center now equals other's center

console.log("widgetPositioning: all assertions passed");
