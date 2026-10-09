import assert from "node:assert/strict";
import {
  WIDGET_IDS,
  STORAGE_KEY,
  RESERVED_OCCUPANCY,
  computeDefaultLayout,
  parseStoredLayout,
  serializeLayout,
  type WidgetLayout,
} from "./widgetLayoutSchema.ts";
import { spanForSize, cellsOverlap, type GridSpec } from "./widgetPositioning.ts";

import { MASCOT_OCCUPANCY } from "./mascotSlot.ts";

// STORAGE_KEY is v7 (v6 → v7: symmetric two-column default). The photo
// widget's removal intentionally did not bump it — stored layouts
// self-heal around the mascot's reserved cell (tested below).
assert.equal(STORAGE_KEY, "portfolio-widget-layout-v7");

// The removed music and photo widgets are no longer widget ids; the
// LeetCode and Codeforces widgets (which replaced the DSA section) are
// appended last, so a returning visitor's existing widgets claim their
// saved cells first and the new ones resolve around them.
assert.deepEqual(WIDGET_IDS, ["aiTools", "location", "motivation", "leetcode", "codeforces", "claude"]);

// The mascot's top-left cell is the (only) reserved occupancy
assert.deepEqual(RESERVED_OCCUPANCY, [MASCOT_OCCUPANCY]);
assert.deepEqual(MASCOT_OCCUPANCY, { cell: { col: 0, row: 0 }, span: { cols: 1, rows: 1 } });

// computeDefaultLayout — 7×3 spec from the design doc
// Verify the exact spec used in the test
const spec: GridSpec = { originX: 83, originY: 64, cols: 7, rows: 3 };
const defaultLayout = computeDefaultLayout(spec);

// All widgets have entries
for (const id of WIDGET_IDS) {
  assert.ok(defaultLayout[id], `missing default for ${id}`);
}

// Claude (medium) sits on the left under the mascot at {0, 1}
assert.deepEqual(defaultLayout.claude, { col: 0, row: 1, size: "medium" });

// No photo entry anymore — the top-left cell belongs to the mascot
assert.equal((defaultLayout as Record<string, unknown>).photo, undefined);

// AITools (GitHub heatmap) should be medium at {5, 0} (cols - 2 = 7 - 2)
assert.equal(defaultLayout.aiTools.size, "medium");
assert.equal(defaultLayout.aiTools.col, 5);
assert.equal(defaultLayout.aiTools.row, 0);

// Location should be small at {5, 1}, directly under the heatmap's left half
assert.equal(defaultLayout.location.size, "small");
assert.equal(defaultLayout.location.col, 5);
assert.equal(defaultLayout.location.row, 1);

// Motivation should be small at {6, 1}, beside location
assert.equal(defaultLayout.motivation.size, "small");
assert.equal(defaultLayout.motivation.col, 6);
assert.equal(defaultLayout.motivation.row, 1);

// LeetCode (medium) sits under the stack at {5, 2}; Codeforces (medium)
// mirrors it in the left column at {0, 2}, keeping the centre clear
assert.deepEqual(defaultLayout.leetcode, { col: 5, row: 2, size: "medium" });
assert.deepEqual(defaultLayout.codeforces, { col: 0, row: 2, size: "medium" });

// No legacy entry leaks into the default layout
assert.equal((defaultLayout as Record<string, unknown>).nowPlaying, undefined);

// A tall lattice gets the very same arrangement (one layout for every
// screen now that the 2×2 music player is gone)
const tallSpec: GridSpec = { originX: 83, originY: 64, cols: 7, rows: 6 };
assert.deepEqual(computeDefaultLayout(tallSpec), defaultLayout);

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

// True when any widget in the layout covers the mascot's reserved cell
function touchesMascot(layout: WidgetLayout): string | null {
  for (const id of WIDGET_IDS) {
    const e = layout[id];
    if (cellsOverlap({ col: e.col, row: e.row }, spanForSize(e.size), MASCOT_OCCUPANCY.cell, MASCOT_OCCUPANCY.span)) {
      return `${id} at (${e.col},${e.row}) ${e.size}`;
    }
  }
  return null;
}

// (a) The default layout never places anything on the mascot cell,
// across a spread of lattice sizes — including narrow ones where the
// right-column stack gets squeezed toward col 0.
for (const [cols, rows] of [[2, 2], [3, 2], [3, 3], [4, 2], [5, 3], [7, 3], [8, 3], [13, 5], [16, 6]]) {
  const s: GridSpec = { originX: 0, originY: 0, cols, rows };
  const layout = computeDefaultLayout(s);
  const hit = touchesMascot(layout);
  assert.equal(hit, null, `default layout on ${cols}x${rows} puts ${hit} on the mascot cell`);
  // The defaults need 8 cells (3 mediums + 2 smalls) beside the
  // mascot's 1, and mediums need 2 free columns side by side, so only
  // lattices of at least 5 columns (or 3 columns × 4+ rows) can hold
  // them collision-free; the undersized ones are only checked against
  // the mascot cell above.
  if (cols >= 5) checkNoOverlaps(layout);
}

// The LeetCode and Codeforces widgets are present, medium, and overlap
// nothing (each other, the other widgets, or the mascot) on the
// lattices real screens produce — including the short 2-row ones
// (~720px tall), where row 2 doesn't exist and the resolver slides
// them into a compact block left of the stack.
const COMMON_LATTICES: [number, number, string][] = [
  [5, 2, "1024×720"],
  [6, 2, "1280×720"],
  [7, 2, "1440×720"],
  [5, 3, "1024×768"],
  [6, 3, "1280×768/800"],
  [7, 3, "1366×768 / 1440×900"],
  [8, 3, "1536×864"],
  [10, 4, "1920×1080"],
  [13, 6, "2560×1440"],
];
for (const [cols, rows, label] of COMMON_LATTICES) {
  const s: GridSpec = { originX: 0, originY: 0, cols, rows };
  const layout = computeDefaultLayout(s);
  for (const id of ["leetcode", "codeforces"] as const) {
    assert.ok(layout[id], `missing ${id} on ${label} (${cols}x${rows})`);
    assert.equal(layout[id].size, "medium", `${id} not medium on ${label}`);
    const { col, row } = layout[id];
    assert.ok(col >= 0 && col + 2 <= cols && row >= 0 && row < rows, `${id} off-lattice on ${label}`);
  }
  assert.equal(touchesMascot(layout), null, `${label}: widget on the mascot cell`);
  checkNoOverlaps(layout);
  // The heatmap stack keeps its place on every one of them
  assert.deepEqual(layout.aiTools, { col: cols - 2, row: 0, size: "medium" });
  assert.deepEqual(layout.location, { col: cols - 2, row: 1, size: "small" });
  assert.deepEqual(layout.motivation, { col: cols - 1, row: 1, size: "small" });
}
// Short lattice (no row 2): LeetCode slides left of the stack, and
// Codeforces moves up under the mascot
const short = computeDefaultLayout({ originX: 0, originY: 0, cols: 6, rows: 2 });
assert.deepEqual(short.leetcode, { col: 2, row: 1, size: "medium" });
assert.deepEqual(short.codeforces, { col: 0, row: 1, size: "medium" });

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
  aiTools: defaultLayout.aiTools,
  location: { col: -1, row: 0, size: "medium" },
  motivation: defaultLayout.motivation,
});
const negColResult = parseStoredLayout(negativeCol, defaultLayout, spec);
assert.deepEqual(negColResult.location, defaultLayout.location);
assert.deepEqual(negColResult.aiTools, defaultLayout.aiTools); // other entries preserved

// parseStoredLayout — valid entry with non-integer col falls back to default for that widget
const nonIntCol = JSON.stringify({
  aiTools: defaultLayout.aiTools,
  location: { col: 1.5, row: 0, size: "medium" },
  motivation: defaultLayout.motivation,
});
const nonIntResult = parseStoredLayout(nonIntCol, defaultLayout, spec);
assert.deepEqual(nonIntResult.location, defaultLayout.location);

// parseStoredLayout — valid entry with bad size falls back to default for that widget
const badSize = JSON.stringify({
  aiTools: defaultLayout.aiTools,
  location: { col: 2, row: 0, size: "not-a-tier" },
  motivation: defaultLayout.motivation,
});
const badSizeResult = parseStoredLayout(badSize, defaultLayout, spec);
assert.deepEqual(badSizeResult.location, defaultLayout.location);

// parseStoredLayout — entry outside lattice gets clamped
const outOfBounds = JSON.stringify({
  aiTools: { col: 100, row: 100, size: "medium" },
  location: defaultLayout.location,
  motivation: defaultLayout.motivation,
});
const clampedResult = parseStoredLayout(outOfBounds, defaultLayout, spec);
// The out-of-bounds cell should be clamped into the lattice
assert(clampedResult.aiTools.col <= spec.cols - spanForSize("medium").cols);
assert(clampedResult.aiTools.row <= spec.rows - spanForSize("medium").rows);
// Other entries should remain unchanged
assert.deepEqual(clampedResult.location, defaultLayout.location);

// parseStoredLayout — clamped entries never overlap with others
const overlapLayout = parseStoredLayout(outOfBounds, defaultLayout, spec);
checkNoOverlaps(overlapLayout);

// parseStoredLayout — a layout saved before the music player and
// photo widget were removed (still carrying "nowPlaying" and "photo"
// entries) loads fine: unknown ids are dropped, every surviving entry
// is kept as saved.
const legacyCustom = {
  photo: { col: 0, row: 0, size: "small" },
  nowPlaying: { col: 3, row: 1, size: "large" },
  aiTools: { col: 5, row: 0, size: "medium" },
  location: { col: 0, row: 2, size: "small" },
  motivation: { col: 6, row: 2, size: "small" },
};
const legacyResult = parseStoredLayout(JSON.stringify(legacyCustom), defaultLayout, spec);
assert.deepEqual(Object.keys(legacyResult).sort(), [...WIDGET_IDS].sort());
assert.equal((legacyResult as Record<string, unknown>).nowPlaying, undefined);
assert.equal((legacyResult as Record<string, unknown>).photo, undefined);
assert.deepEqual(legacyResult.aiTools, legacyCustom.aiTools);
assert.deepEqual(legacyResult.location, legacyCustom.location);
assert.deepEqual(legacyResult.motivation, legacyCustom.motivation);
checkNoOverlaps(legacyResult);
// ...and re-serializing it no longer writes the dead entries back
assert.equal(JSON.parse(serializeLayout(legacyResult)).nowPlaying, undefined);
assert.equal(JSON.parse(serializeLayout(legacyResult)).photo, undefined);

// parseStoredLayout — a returning visitor's v6 layout saved before the
// LeetCode/Codeforces widgets existed: their own arrangement is kept
// as saved, and both new widgets appear (from defaults), resolved
// around it without overlap.
const preCoding = {
  aiTools: { col: 3, row: 2, size: "medium" },
  location: { col: 5, row: 2, size: "small" },
  motivation: { col: 6, row: 2, size: "small" },
};
const preCodingResult = parseStoredLayout(JSON.stringify(preCoding), defaultLayout, spec);
assert.deepEqual(preCodingResult.aiTools, preCoding.aiTools);
assert.deepEqual(preCodingResult.location, preCoding.location);
assert.deepEqual(preCodingResult.motivation, preCoding.motivation);
assert.equal(preCodingResult.leetcode.size, "medium");
assert.equal(preCodingResult.codeforces.size, "medium");
assert.equal(touchesMascot(preCodingResult), null);
checkNoOverlaps(preCodingResult);
// ...and with the untouched default arrangement saved, they land on
// their exact default cells.
const preCodingDefault = parseStoredLayout(
  JSON.stringify({ aiTools: defaultLayout.aiTools, location: defaultLayout.location, motivation: defaultLayout.motivation }),
  defaultLayout,
  spec,
);
assert.deepEqual(preCodingDefault, defaultLayout);

// (b) parseStoredLayout — a saved v6 layout with a widget parked on
// the mascot's cell (0,0) is resolved OFF it to the nearest free cell,
// while the rest of the arrangement is kept as saved.
const onMascot = {
  aiTools: { col: 5, row: 0, size: "medium" },
  location: { col: 0, row: 0, size: "small" },
  motivation: { col: 6, row: 1, size: "small" },
};
const healed = parseStoredLayout(JSON.stringify(onMascot), defaultLayout, spec);
assert.equal(touchesMascot(healed), null);
// Nearest free cell to (0,0) — (0,1) wins over (1,0) because
// resolveCellCollision scans column-major and keeps the first of the
// tied distance-1 candidates.
assert.deepEqual(healed.location, { col: 0, row: 1, size: "small" });
assert.deepEqual(healed.aiTools, onMascot.aiTools);
assert.deepEqual(healed.motivation, onMascot.motivation);
checkNoOverlaps(healed);

// ...a medium or large widget whose span merely COVERS (0,0) is moved
// too, not just one anchored there.
for (const size of ["medium", "large"] as const) {
  const covering = { ...onMascot, location: { col: 0, row: 0, size } };
  const result = parseStoredLayout(JSON.stringify(covering), defaultLayout, spec);
  assert.equal(touchesMascot(result), null, `${size} covering (0,0) not moved off`);
  checkNoOverlaps(result);
}

// ...and on every lattice size, every widget stacked onto (0,0) is
// resolved off it (all six as smalls, so even the 4×2 lattice's seven
// free cells can hold them; 3×2 has only five, fewer than the widgets).
for (const [cols, rows] of [[4, 2], [5, 3], [7, 3], [13, 5]]) {
  const s: GridSpec = { originX: 0, originY: 0, cols, rows };
  const allOnMascot = JSON.stringify({
    aiTools: { col: 0, row: 0, size: "small" },
    location: { col: 0, row: 0, size: "small" },
    motivation: { col: 0, row: 0, size: "small" },
    leetcode: { col: 0, row: 0, size: "small" },
    codeforces: { col: 0, row: 0, size: "small" },
    claude: { col: 0, row: 0, size: "small" },
  });
  const result = parseStoredLayout(allOnMascot, computeDefaultLayout(s), s);
  assert.equal(touchesMascot(result), null, `stored layout on ${cols}x${rows} left a widget on the mascot cell`);
  checkNoOverlaps(result);
}

console.log("widgetLayoutSchema: all assertions passed");
