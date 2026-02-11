// Shared utilities for arc-length parameterized track path operations.
// Used by both the Trackmap SVG renderer and the path-locked car position hook.

// Computes cumulative arc lengths along a path for arc-length parameterization.
// Returns an array where arcLengths[i] = total distance from path[0] to path[i].
export const computeArcLengths = (path: { x: number; y: number }[]): number[] => {
  const lengths = [0]
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x
    const dy = path[i].y - path[i - 1].y
    lengths.push(lengths[i - 1] + Math.sqrt(dx * dx + dy * dy))
  }
  return lengths
}

// Computes a point and tangent direction at a given progress (0-1) along a path.
// Uses arc-length lookup so progress 0.5 = "50% by distance around the track".
export const getPointAndTangentAtProgress = (
  path: { x: number; y: number }[],
  arcLengths: number[],
  progress: number,
): { point: { x: number; y: number }; tangent: { dx: number; dy: number } } | null => {
  if (path.length < 2) return null
  const totalLength = arcLengths[arcLengths.length - 1]
  if (totalLength === 0) return null

  const targetLength = Math.max(0, Math.min(1, progress)) * totalLength

  // Binary search for the segment containing targetLength.
  let lo = 0
  let hi = path.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (arcLengths[mid] <= targetLength) lo = mid
    else hi = mid
  }

  const segLength = arcLengths[hi] - arcLengths[lo]
  const t = segLength > 0 ? (targetLength - arcLengths[lo]) / segLength : 0

  // Interpolated point on the segment.
  const point = {
    x: path[lo].x + (path[hi].x - path[lo].x) * t,
    y: path[lo].y + (path[hi].y - path[lo].y) * t,
  }

  // Unit tangent direction along the segment.
  const dx = path[hi].x - path[lo].x
  const dy = path[hi].y - path[lo].y
  const len = Math.sqrt(dx * dx + dy * dy)
  const tangent = len > 0 ? { dx: dx / len, dy: dy / len } : { dx: 1, dy: 0 }

  return { point, tangent }
}

// Convenience wrapper: returns only the on-path point at the given progress.
export const getPointAtProgress = (
  path: { x: number; y: number }[],
  arcLengths: number[],
  progress: number,
): { x: number; y: number } | null => {
  const result = getPointAndTangentAtProgress(path, arcLengths, progress)
  return result ? result.point : null
}
