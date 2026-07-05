import assert from "node:assert/strict";
import {
  WIDGET_IDS,
  STORAGE_KEY,
  computeDefaultLayout,
  parseStoredLayout,
  serializeLayout,
  type WidgetLayout,
} from "./widgetLayoutSchema.ts";
import { spanForSize, cellsOverlap, type GridSpec } from "./widgetPositioning.ts";

// STORAGE_KEY is v5
assert.equal(STORAGE_KEY, "portfolio-widget-layout-v5");

// computeDefaultLayout — 7×3 spec from the design doc
// Verify the exact spec used in the test
const spec: GridSpec = { originX: 83, originY: 64, cols: 7, rows: 3 };
const defaultLayout = computeDefaultLayout(spec);

// All widgets have entries
for (const id of WIDGET_IDS) {
  assert.ok(defaultLayout[id], `missing default for ${id}`);
}

// Photo should be medium at {0, 0}
assert.equal(defaultLayout.photo.size, "medium");
assert.equal(defaultLayout.photo.col, 0);
assert.equal(defaultLayout.photo.row, 0);

// NowPlaying should be large at {0, 1}
assert.equal(defaultLayout.nowPlaying.size, "large");
assert.equal(defaultLayout.nowPlaying.col, 0);
assert.equal(defaultLayout.nowPlaying.row, 1);

// AITools should be medium at {5, 0} (cols - 2 = 7 - 2)
assert.equal(defaultLayout.aiTools.size, "medium");
assert.equal(defaultLayout.aiTools.col, 5);
assert.equal(defaultLayout.aiTools.row, 0);

// Location should be small at {6, 1} (cols - 1 = 7 - 1, and row 1)
assert.equal(defaultLayout.location.size, "small");
assert.equal(defaultLayout.location.col, 6);
assert.equal(defaultLayout.location.row, 1);

// Motivation should be medium at {5, 2} (cols - 2, rows - 1)
assert.equal(defaultLayout.motivation.size, "medium");
assert.equal(defaultLayout.motivation.col, 5);
assert.equal(defaultLayout.motivation.row, 2);

// Verify no pair overlaps
function checkNoOverlaps(layout: WidgetLayout) {
  for (let i = 0; i < WIDGET_IDS.length; i++) {
    for (let j = i + 1; j < WIDGET_IDS.length; j++) {
      const idA = WIDGET_IDS[i];
      const idB = WIDGET_IDS[j];
      const entryA = layout[idA];
      const entryB = layout[idB];
      const spanA = spanForSize(entryA.size);
      const spanB = spanForSize(entryB.size);
      const overlaps = cellsOverlap(
        { col: entryA.col, row: entryA.row },
        spanA,
        { col: entryB.col, row: entryB.row },
        spanB
      );
      assert(!overlaps, `${idA} at (${entryA.col},${entryA.row}) overlaps ${idB} at (${entryB.col},${entryB.row})`);
    }
  }
}
checkNoOverlaps(defaultLayout);

// computeDefaultLayout on a tiny spec still produces a valid layout
// (collision-free is not guaranteed on undersized lattices)
const tinySpec: GridSpec = { originX: 0, originY: 0, cols: 2, rows: 2 };
const tinyLayout = computeDefaultLayout(tinySpec);
// All widgets have entries
for (const id of WIDGET_IDS) {
  assert.ok(tinyLayout[id], `missing entry for ${id} in tiny layout`);
}

// serializeLayout round-trips through parseStoredLayout
const serialized = serializeLayout(defaultLayout);
assert.equal(typeof serialized, "string");
const parsed = JSON.parse(serialized);
assert.equal(typeof parsed, "object");

const roundTripped = parseStoredLayout(serialized, defaultLayout, spec);
assert.deepEqual(roundTripped, defaultLayout);

// parseStoredLayout — null raw falls back to defaults
const nullResult = parseStoredLayout(null, defaultLayout, spec);
assert.deepEqual(nullResult, defaultLayout);

// parseStoredLayout — garbage raw falls back to defaults
const garbageResult = parseStoredLayout("{not valid json", defaultLayout, spec);
assert.deepEqual(garbageResult, defaultLayout);

// parseStoredLayout — non-JSON raw falls back to defaults
const nonJsonResult = parseStoredLayout("just some text", defaultLayout, spec);
assert.deepEqual(nonJsonResult, defaultLayout);

// parseStoredLayout — valid entry with negative col falls back to default for that widget
const negativeCol = JSON.stringify({
  photo: { col: -1, row: 0, size: "medium" },
  nowPlaying: defaultLayout.nowPlaying,
  aiTools: defaultLayout.aiTools,
  location: defaultLayout.location,
  motivation: defaultLayout.motivation,
});
const negColResult = parseStoredLayout(negativeCol, defaultLayout, spec);
assert.deepEqual(negColResult.photo, defaultLayout.photo);
assert.deepEqual(negColResult.nowPlaying, defaultLayout.nowPlaying); // other entries preserved

// parseStoredLayout — valid entry with non-integer col falls back to default for that widget
const nonIntCol = JSON.stringify({
  photo: { col: 1.5, row: 0, size: "medium" },
  nowPlaying: defaultLayout.nowPlaying,
  aiTools: defaultLayout.aiTools,
  location: defaultLayout.location,
  motivation: defaultLayout.motivation,
});
const nonIntResult = parseStoredLayout(nonIntCol, defaultLayout, spec);
assert.deepEqual(nonIntResult.photo, defaultLayout.photo);

// parseStoredLayout — valid entry with bad size falls back to default for that widget
const badSize = JSON.stringify({
  photo: { col: 0, row: 0, size: "not-a-tier" },
  nowPlaying: defaultLayout.nowPlaying,
  aiTools: defaultLayout.aiTools,
  location: defaultLayout.location,
  motivation: defaultLayout.motivation,
});
const badSizeResult = parseStoredLayout(badSize, defaultLayout, spec);
assert.deepEqual(badSizeResult.photo, defaultLayout.photo);

// parseStoredLayout — entry outside lattice gets clamped
const outOfBounds = JSON.stringify({
  photo: { col: 100, row: 100, size: "medium" },
  nowPlaying: defaultLayout.nowPlaying,
  aiTools: defaultLayout.aiTools,
  location: defaultLayout.location,
  motivation: defaultLayout.motivation,
});
const clampedResult = parseStoredLayout(outOfBounds, defaultLayout, spec);
// Photo's out-of-bounds cell should be clamped
assert(clampedResult.photo.col <= spec.cols - spanForSize("medium").cols);
assert(clampedResult.photo.row <= spec.rows - spanForSize("medium").rows);
// Other entries should remain unchanged
assert.deepEqual(clampedResult.nowPlaying, defaultLayout.nowPlaying);

// parseStoredLayout — clamped entries never overlap with others
const overlapLayout = parseStoredLayout(outOfBounds, defaultLayout, spec);
checkNoOverlaps(overlapLayout);

console.log("widgetLayoutSchema: all assertions passed");
