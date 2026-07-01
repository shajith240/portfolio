/* Procedural clip-path for the genie-effect minimize/restore animation.
 *
 * Real macOS behavior (documented, not guessed — see
 * docs/superpowers/specs/2026-07-01-genie-effect-and-finder-design.md):
 * the top edge stays fixed while the bottom edge shears and narrows,
 * and the sides curve inward like a funnel/neck rather than straight
 * trapezoid sides.
 *
 * [Web adaptation] True per-pixel mesh warping (what native macOS
 * actually does via SpriteKit) would require rasterizing the window's
 * live iframe content to a canvas every frame — fragile across a frame
 * boundary even same-origin. Instead this animates the window's own
 * `clip-path` from a full rectangle to a tapering funnel silhouette,
 * layered on top of the existing position/scale animation toward the
 * Dock icon. The funnel shape itself is self-contained (percentages of
 * the window's own box) — it doesn't need to know the Dock icon's
 * absolute position; the existing x/y/scale motion values already
 * carry the window there.
 */

const STEPS = 6;

export function genieClipPath(progress: number): string {
  const p = Math.min(1, Math.max(0, progress));

  if (p <= 0) {
    return "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)";
  }

  // Half-width of the narrow "neck" at the bottom, as a percentage of
  // the window's width — shrinks from 50 (full width) down to 8 (a
  // thin band) as progress goes from 0 to 1.
  const neckHalfWidth = 50 - 42 * p;
  const bottomLeft = 50 - neckHalfWidth;
  const bottomRight = 50 + neckHalfWidth;

  const leftPoints: string[] = [];
  const rightPoints: string[] = [];

  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS; // 0 at the top edge, 1 at the bottom edge
    // Eases the curve so it stays close to the original straight edge
    // near the top and sweeps inward more sharply near the bottom —
    // the "neck" shape, not a straight-sided trapezoid.
    const curve = Math.pow(t, 2.2);
    const leftX = bottomLeft * curve;
    const rightX = 100 - (100 - bottomRight) * curve;
    const y = t * 100;
    leftPoints.push(`${leftX}% ${y}%`);
    rightPoints.push(`${rightX}% ${y}%`);
  }

  // Closed polygon, clockwise: top-left -> top-right -> down the right
  // side -> across the bottom -> up the left side -> back to top-left.
  const descendingRight = rightPoints;
  const ascendingLeft = [...leftPoints].reverse();
  return `polygon(${descendingRight.join(", ")}, ${ascendingLeft.join(", ")})`;
}
