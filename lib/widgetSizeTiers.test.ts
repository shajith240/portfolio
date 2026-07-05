import assert from "node:assert/strict";
import {
  TIER_DIMENSIONS,
  ALL_SIZES,
  getSizeDimensions,
  nearestSizeTier,
  supportedSizes,
  type WidgetSize,
} from "./widgetSizeTiers.ts";
import { WIDGET_UNIT, WIDGET_MEDIUM_WIDTH } from "./widgetGrid.ts";

// TIER_DIMENSIONS is the universal table — every widget uses these
assert.equal(TIER_DIMENSIONS.small.width, WIDGET_UNIT); // 170
assert.equal(TIER_DIMENSIONS.small.height, WIDGET_UNIT); // 170
assert.equal(TIER_DIMENSIONS.medium.width, WIDGET_MEDIUM_WIDTH); // 354
assert.equal(TIER_DIMENSIONS.medium.height, WIDGET_UNIT); // 170
assert.equal(TIER_DIMENSIONS.large.width, WIDGET_MEDIUM_WIDTH); // 354
assert.equal(TIER_DIMENSIONS.large.height, WIDGET_MEDIUM_WIDTH); // 354

// ALL_SIZES includes all three tiers
assert.deepEqual(ALL_SIZES, ["small", "medium", "large"]);

// getSizeDimensions returns the universal tier dims for any widget
assert.deepEqual(getSizeDimensions("photo", "small"), { width: 170, height: 170 });
assert.deepEqual(getSizeDimensions("photo", "medium"), { width: 354, height: 170 });
assert.deepEqual(getSizeDimensions("photo", "large"), { width: 354, height: 354 });
assert.deepEqual(getSizeDimensions("nowPlaying", "large"), { width: 354, height: 354 });
assert.deepEqual(getSizeDimensions("motivation", "small"), { width: 170, height: 170 });

// supportedSizes — every widget supports all three sizes
assert.deepEqual(supportedSizes("photo"), ["small", "medium", "large"]);
assert.deepEqual(supportedSizes("nowPlaying"), ["small", "medium", "large"]);
assert.deepEqual(supportedSizes("aiTools"), ["small", "medium", "large"]);
assert.deepEqual(supportedSizes("location"), ["small", "medium", "large"]);
assert.deepEqual(supportedSizes("motivation"), ["small", "medium", "large"]);

// nearestSizeTier(width, height) finds the tier with minimum Euclidean distance
// Exact match: small
assert.equal(nearestSizeTier(170, 170), "small");
// Exact match: medium
assert.equal(nearestSizeTier(354, 170), "medium");
// Exact match: large
assert.equal(nearestSizeTier(354, 354), "large");

// Near small: a live resize at 180×180 snaps to small (closer than medium)
const smallDist = Math.hypot(170 - 175, 170 - 175);
const mediumDist = Math.hypot(354 - 175, 170 - 175);
assert(smallDist < mediumDist, "small should be closer to 175×175 than medium");
assert.equal(nearestSizeTier(175, 175), "small");

// Midpoint between small and medium (width-only): 262×170
// Distance to small: Math.hypot(170-262, 170-170) = 92
// Distance to medium: Math.hypot(354-262, 170-170) = 92 (tie, but 170-height matches both)
// In a true tie, the algorithm will return whichever comes first in iteration order
assert.equal(nearestSizeTier(262, 170), "small");

// Far outside range: clamps to nearest (large)
assert.equal(nearestSizeTier(500, 500), "large");
assert.equal(nearestSizeTier(0, 0), "small");

console.log("widgetSizeTiers: all assertions passed");
