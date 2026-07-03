import { MOTIVATION_IMAGE } from "../data/motivation.ts";

export type WidgetSize = "small" | "medium" | "large";
export type WidgetId = "photo" | "nowPlaying" | "aiTools" | "clock" | "motivation";

export interface SizeDimensions {
  width: number;
  // Omitted = content-driven (render height: "auto"); nearestSizeTier
  // then matches on width alone for that tier.
  height?: number;
}

const motivationMediumHeight = Math.round(210 * (MOTIVATION_IMAGE.height / MOTIVATION_IMAGE.width));
const motivationLargeHeight = Math.round(260 * (MOTIVATION_IMAGE.height / MOTIVATION_IMAGE.width));

// Real, computed dimensions — see the task's design notes for the
// exact math behind each fixed-height value. Widgets whose tier omits
// `height` render at their natural content height for that tier
// (verified deterministic per-widget in Tasks 7-11: fixed-line text
// with ellipsis truncation never changes height regardless of content
// length).
export const WIDGET_SIZE_TIERS: Record<WidgetId, Partial<Record<WidgetSize, SizeDimensions>>> = {
  photo: {
    small: { width: 155, height: 155 },
    medium: { width: 260, height: 260 },
    large: { width: 338, height: 338 },
  },
  nowPlaying: {
    small: { width: 155, height: 155 },
    medium: { width: 260 },
    large: { width: 260 },
  },
  aiTools: {
    small: { width: 155, height: 155 },
    medium: { width: 260, height: 176 },
    large: { width: 260, height: 256 },
  },
  clock: {
    small: { width: 155 },
    medium: { width: 260, height: 176 },
    large: { width: 260 },
  },
  motivation: {
    medium: { width: 210, height: motivationMediumHeight },
    large: { width: 260, height: motivationLargeHeight },
  },
};

export function supportedSizes(id: WidgetId): WidgetSize[] {
  return Object.keys(WIDGET_SIZE_TIERS[id]) as WidgetSize[];
}

export function getSizeDimensions(id: WidgetId, size: WidgetSize): SizeDimensions {
  const tiers = WIDGET_SIZE_TIERS[id];
  return tiers[size] ?? tiers[supportedSizes(id)[0]]!;
}

// Given a widget's own tier table and a live width/height (e.g. mid
// resize-drag), finds the tier whose defined dimensions are
// numerically closest. A tier with no `height` (content-driven) is
// compared on width alone.
export function nearestSizeTier(
  tiers: Partial<Record<WidgetSize, SizeDimensions>>,
  liveWidth: number,
  liveHeight: number
): WidgetSize {
  const entries = Object.entries(tiers) as [WidgetSize, SizeDimensions][];
  let best = entries[0][0];
  let bestDist = Infinity;
  for (const [size, dims] of entries) {
    const dist =
      dims.height === undefined
        ? Math.abs(dims.width - liveWidth)
        : Math.hypot(dims.width - liveWidth, dims.height - liveHeight);
    if (dist < bestDist) {
      bestDist = dist;
      best = size;
    }
  }
  return best;
}
