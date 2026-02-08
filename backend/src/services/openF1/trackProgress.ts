// Utilities for mapping car GPS positions onto a display track path.
// The GPS reference path (from live car data) and the display path (from
// MultiViewer or GPS) may use different coordinate systems. Track progress
// (0–1) bridges the two: find the car's position on the GPS path, then
// map that normalised progress to the equivalent point on the display path.

// Finds the nearest point on the reference path to the given car position
// and returns a normalised progress value (0.0 = start, 1.0 = end).
// Uses simple linear scan — the reference path is typically ~100-200 points,
// so this is trivially fast even at 10 Hz for 20 cars.
export const computeTrackProgress = (
  carX: number,
  carY: number,
  referencePath: { x: number; y: number }[],
): number => {
  if (referencePath.length === 0) return 0

  let minDistSq = Infinity
  let nearestIndex = 0

  for (let i = 0; i < referencePath.length; i++) {
    const dx = carX - referencePath[i].x
    const dy = carY - referencePath[i].y
    const distSq = dx * dx + dy * dy
    if (distSq < minDistSq) {
      minDistSq = distSq
      nearestIndex = i
    }
  }

  return referencePath.length <= 1 ? 0 : nearestIndex / (referencePath.length - 1)
}

// Maps a normalised progress value (0–1) onto a display path, returning
// the interpolated {x, y} coordinate at that point along the path.
// Linearly interpolates between the two bracketing path points for
// sub-index precision.
export const mapProgressToPoint = (
  progress: number,
  displayPath: { x: number; y: number }[],
): { x: number; y: number } => {
  if (displayPath.length === 0) return { x: 0, y: 0 }
  if (displayPath.length === 1) return displayPath[0]

  // Clamp progress to [0, 1].
  const clamped = Math.max(0, Math.min(1, progress))
  const exactIndex = clamped * (displayPath.length - 1)
  const lower = Math.floor(exactIndex)
  const upper = Math.min(lower + 1, displayPath.length - 1)
  const fraction = exactIndex - lower

  // Linearly interpolate between the two bracketing points.
  return {
    x: displayPath[lower].x + (displayPath[upper].x - displayPath[lower].x) * fraction,
    y: displayPath[lower].y + (displayPath[upper].y - displayPath[lower].y) * fraction,
  }
}
