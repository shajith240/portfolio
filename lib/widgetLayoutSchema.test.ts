import assert from "node:assert/strict";
import {
  WIDGET_IDS,
  computeDefaultLayout,
  parseStoredLayout,
  serializeLayout,
} from "./widgetLayoutSchema.ts";

// computeDefaultLayout — reconstructs today's fixed arrangement
const metrics = { viewportWidth: 1440, viewportHeight: 900, inset: 20 };
const defaults = computeDefaultLayout(metrics);
for (const id of WIDGET_IDS) assert.ok(defaults[id], `missing default for ${id}`);
assert.equal(defaults.photo.x, 20); // left column, inset
assert.equal(defaults.photo.y, 60); // inset + 40
assert.equal(defaults.nowPlaying.y, 60 + 260 + 14); // below photo (medium height) + gap
assert.equal(defaults.aiTools.x, 1440 - 20 - 260); // right column
assert.equal(defaults.clock.y, 60 + 176 + 14); // below aiTools (medium height) + gap
assert.equal(defaults.nowPlaying.size, "large"); // today's shipped behavior includes lyrics
assert.equal(defaults.motivation.size, "medium");

// serializeLayout round-trips through parseStoredLayout
const serialized = serializeLayout(defaults);
const parsedBack = parseStoredLayout(serialized, defaults);
assert.deepEqual(parsedBack, defaults);

// parseStoredLayout — null/missing raw falls back to defaults entirely
assert.deepEqual(parseStoredLayout(null, defaults), defaults);

// parseStoredLayout — corrupted JSON falls back to defaults entirely
assert.deepEqual(parseStoredLayout("{not valid json", defaults), defaults);

// parseStoredLayout — one malformed entry falls back only for that widget
const partiallyBad = JSON.stringify({
  ...defaults,
  clock: { x: "not-a-number", y: 0, size: "medium" },
});
const partialResult = parseStoredLayout(partiallyBad, defaults);
assert.deepEqual(partialResult.clock, defaults.clock); // fell back
assert.deepEqual(partialResult.photo, defaults.photo); // untouched, still the saved value

console.log("widgetLayoutSchema: all assertions passed");
