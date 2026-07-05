import { WIDGET_UNIT, WIDGET_MEDIUM_WIDTH } from "./widgetGrid.ts";

export type WidgetSize = "small" | "medium" | "large";
export type WidgetId = "photo" | "nowPlaying" | "aiTools" | "location" | "motivation";

export interface SizeDimensions {
  width: number;
  height: number;
}

// Apple's real widget size family — ONE table for every widget, no
// per-widget custom dimensions. small is a square, medium is exactly
// two smalls plus one gutter wide at small's height, large is a
// square with medium's width. Widgets adapt their content to these
// frames, never the other way around: that invariant is what makes
// any mix of widgets read as one coherent grid, and it's the direct
// replacement for the previous per-widget ad-hoc table (155/159/176/
// 338/content-driven heights) that made mixed sizes look broken.
export const TIER_DIMENSIONS: Record<WidgetSize, SizeDimensions> = {
  small: { width: WIDGET_UNIT, height: WIDGET_UNIT },
  medium: { width: WIDGET_MEDIUM_WIDTH, height: WIDGET_UNIT },
  large: { width: WIDGET_MEDIUM_WIDTH, height: WIDGET_MEDIUM_WIDTH },
};

export const ALL_SIZES: WidgetSize[] = ["small", "medium", "large"];

// Every widget supports every tier — the "purest form" of the widget
// mechanism, no per-widget restrictions.
export function supportedSizes(_id: WidgetId): WidgetSize[] {
  return ALL_SIZES;
}

export function getSizeDimensions(_id: WidgetId, size: WidgetSize): SizeDimensions {
  return TIER_DIMENSIONS[size];
}

// Given a live width/height mid resize-drag, finds the tier whose
// frame is numerically closest — the tier the widget springs to on
// release.
export function nearestSizeTier(liveWidth: number, liveHeight: number): WidgetSize {
  let best: WidgetSize = ALL_SIZES[0];
  let bestDist = Infinity;
  for (const size of ALL_SIZES) {
    const dims = TIER_DIMENSIONS[size];
    const dist = Math.hypot(dims.width - liveWidth, dims.height - liveHeight);
    if (dist < bestDist) {
      bestDist = dist;
      best = size;
    }
  }
  return best;
}
