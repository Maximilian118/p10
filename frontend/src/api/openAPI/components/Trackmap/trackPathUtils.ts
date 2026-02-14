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

// Extracts a sub-path between two progress values (0-1) along the track.
// Handles wrap-around when endProgress < startProgress (e.g. sector 3 crossing start/finish).
export const getSubPath = (
  path: { x: number; y: number }[],
  arcLengths: number[],
  startProgress: number,
  endProgress: number,
): { x: number; y: number }[] => {
  // If wrapping (end < start), split into two segments: [start → 1.0] + [0.0 → end].
  if (endProgress < startProgress) {
    return [
      ...getSubPath(path, arcLengths, startProgress, 1.0),
      ...getSubPath(path, arcLengths, 0.0, endProgress),
    ]
  }

  const totalLength = arcLengths[arcLengths.length - 1]
  const startDist = startProgress * totalLength
  const endDist = endProgress * totalLength
  const result: { x: number; y: number }[] = []

  // Add interpolated start point.
  const startPt = getPointAtProgress(path, arcLengths, startProgress)
  if (startPt) result.push(startPt)

  // Add all intermediate path points between start and end distances.
  for (let i = 0; i < path.length; i++) {
    if (arcLengths[i] > startDist && arcLengths[i] < endDist) {
      result.push(path[i])
    }
  }

  // Add interpolated end point.
  const endPt = getPointAtProgress(path, arcLengths, endProgress)
  if (endPt) result.push(endPt)

  return result
}

// Builds an open SVG path string from a list of points (no Z closure).
export const buildOpenSvgPath = (points: { x: number; y: number }[]): string => {
  if (points.length === 0) return ""
  const [first, ...rest] = points
  return `M ${first.x},${first.y} ${rest.map((p) => `L ${p.x},${p.y}`).join(" ")}`
}

// Computes the signed area of a polygon using the shoelace formula.
// Positive = counter-clockwise, Negative = clockwise (in the path's coordinate space).
export const computeSignedArea = (path: { x: number; y: number }[]): number => {
  let area = 0
  const n = path.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += path[i].x * path[j].y
    area -= path[j].x * path[i].y
  }
  return area / 2
}
