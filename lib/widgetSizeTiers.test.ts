import assert from "node:assert/strict";
import { WIDGET_SIZE_TIERS, getSizeDimensions, nearestSizeTier, supportedSizes } from "./widgetSizeTiers.ts";

// getSizeDimensions
assert.deepEqual(getSizeDimensions("photo", "medium"), { width: 260, height: 260 });
assert.deepEqual(getSizeDimensions("aiTools", "large"), { width: 260, height: 256 });

// supportedSizes — motivation has no "small" tier
assert.deepEqual(supportedSizes("motivation"), ["medium", "large"]);
assert.deepEqual(supportedSizes("photo"), ["small", "medium", "large"]);

// nearestSizeTier — synthetic tiers, decoupled from real widget data
const tiers = { small: { width: 100, height: 100 }, medium: { width: 200, height: 200 }, large: { width: 300, height: 300 } };
assert.equal(nearestSizeTier(tiers, 120, 110), "small");
assert.equal(nearestSizeTier(tiers, 210, 195), "medium");
assert.equal(nearestSizeTier(tiers, 500, 500), "large"); // clamps to nearest even far outside range

// nearestSizeTier — width-only tier (height omitted = don't compare on it)
const widthOnlyTiers = { small: { width: 100 }, large: { width: 300 } };
assert.equal(nearestSizeTier(widthOnlyTiers, 90, 9999), "small"); // huge height ignored, width decides

console.log("widgetSizeTiers: all assertions passed");
