import { getSizeDimensions, type WidgetId, type WidgetSize } from "./widgetSizeTiers.ts";
import { WIDGET_GAP } from "./widgetGrid.ts";

export type { WidgetId, WidgetSize };

export interface WidgetLayoutEntry {
  x: number;
  y: number;
  size: WidgetSize;
}

export type WidgetLayout = Record<WidgetId, WidgetLayoutEntry>;

export const WIDGET_IDS: WidgetId[] = ["photo", "nowPlaying", "aiTools", "clock", "motivation"];

// Versioned — a future schema change bumps this suffix and simply
// falls back to defaults for old keys, no migration needed.
export const STORAGE_KEY = "portfolio-widget-layout-v1";

export interface ShellMetricsInput {
  viewportWidth: number;
  viewportHeight: number;
  inset: number;
}

// Bottom clearance above the Dock — same value as
// WindowManagerContext.BOTTOM_RESERVE, duplicated here (not imported)
// because contexts/ isn't reachable from lib/ without a client-only
// import; kept in sync by the same design-system doc both cite.
const BOTTOM_RESERVE = 110;

// Mirrors the exact math DesktopWidgetStack/RightWidgetStack/
// MotivationWidget used before this feature existed, so a first-time
// visitor's canvas renders pixel-identical to today's fixed layout —
// nothing visually changes until they actually drag or resize
// something.
export function computeDefaultLayout(metrics: ShellMetricsInput): WidgetLayout {
  const topY = metrics.inset + 40;
  const leftX = metrics.inset;
  const photoHeight = getSizeDimensions("photo", "medium").height!;
  const nowPlayingY = topY + photoHeight + WIDGET_GAP;

  const aiToolsWidth = getSizeDimensions("aiTools", "medium").width;
  const aiToolsHeight = getSizeDimensions("aiTools", "medium").height!;
  const rightX = metrics.viewportWidth - metrics.inset - aiToolsWidth;
  const clockY = topY + aiToolsHeight + WIDGET_GAP;

  const motivation = getSizeDimensions("motivation", "medium");
  const motivationX = metrics.viewportWidth - metrics.inset - motivation.width;
  const motivationY = metrics.viewportHeight - BOTTOM_RESERVE - motivation.height!;

  return {
    photo: { x: leftX, y: topY, size: "medium" },
    // "large" here is what ships today — NowPlayingWidget always
    // renders its lyrics panel currently; that becomes this tier.
    nowPlaying: { x: leftX, y: nowPlayingY, size: "large" },
    aiTools: { x: rightX, y: topY, size: "medium" },
    clock: { x: rightX, y: clockY, size: "medium" },
    motivation: { x: motivationX, y: motivationY, size: "medium" },
  };
}

const VALID_SIZES: WidgetSize[] = ["small", "medium", "large"];

function isValidEntry(value: unknown): value is WidgetLayoutEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.x === "number" &&
    Number.isFinite(entry.x) &&
    typeof entry.y === "number" &&
    Number.isFinite(entry.y) &&
    typeof entry.size === "string" &&
    VALID_SIZES.includes(entry.size as WidgetSize)
  );
}

// Pure — takes the raw localStorage string (or null) and the
// defaults for this viewport, returns a fully valid WidgetLayout.
// Any missing or malformed per-widget entry falls back to that
// widget's own default individually, so one corrupted entry never
// blanks the whole layout.
export function parseStoredLayout(raw: string | null, defaults: WidgetLayout): WidgetLayout {
  if (!raw) return defaults;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaults;
  }
  if (typeof parsed !== "object" || parsed === null) return defaults;
  const result = {} as WidgetLayout;
  for (const id of WIDGET_IDS) {
    const candidate = (parsed as Record<string, unknown>)[id];
    result[id] = isValidEntry(candidate) ? candidate : defaults[id];
  }
  return result;
}

export function serializeLayout(layout: WidgetLayout): string {
  return JSON.stringify(layout);
}
