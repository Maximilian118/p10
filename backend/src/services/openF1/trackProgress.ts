// Utilities for mapping car GPS positions onto a display track path.
// The GPS reference path (from live car data) and the display path (from
// MultiViewer or GPS) may use different coordinate systems. Track progress
// (0–1) bridges the two: find the car's position on the GPS path, then
// map that normalised progress to the equivalent point on the display path.

// Computes cumulative arc lengths along a path for arc-length parameterization.
// Returns an array where arcLengths[i] = total distance from path[0] to path[i].
export const computeArcLengths = (
  path: { x: number; y: number }[],
): number[] => {
  const lengths = [0]
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x
    const dy = path[i].y - path[i - 1].y
    lengths.push(lengths[i - 1] + Math.sqrt(dx * dx + dy * dy))
  }
  return lengths
}

// Finds the car's progress (0–1) along the reference path by projecting
// onto the nearest line segment. Uses arc-length normalisation so progress
// is proportional to physical distance along the track.
// Pass pre-computed arcLengths to avoid recomputing per call on the hot path.
// When hintProgress is provided, restricts the search to a ±15% window around
// the hint to avoid nearest-segment ambiguity on tracks where sections run close
// together (e.g. Shanghai turns 14-16). Falls back to global search if no hint.
export const computeTrackProgress = (
  carX: number,
  carY: number,
  referencePath: { x: number; y: number }[],
  arcLengths?: number[],
  hintProgress?: number,
): number => {
  if (referencePath.length === 0) return 0
  if (referencePath.length === 1) return 0

  // Compute arc lengths on demand if not pre-cached.
  const lengths = arcLengths || computeArcLengths(referencePath)
  const totalLength = lengths[lengths.length - 1]
  if (totalLength === 0) return 0

  const numSegs = referencePath.length - 1
  let minDistSq = Infinity
  let bestProgress = 0

  // Determine search range: full path or windowed around hint.
  let startIdx = 0
  let endIdx = numSegs

  if (hintProgress !== undefined) {
    // Binary search for the segment containing the hint progress.
    const targetLen = Math.max(0, Math.min(1, hintProgress)) * totalLength
    let lo = 0
    let hi = referencePath.length - 1
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1
      if (lengths[mid] <= targetLen) lo = mid
      else hi = mid
    }
    // Search ±15% of segments around the hint, minimum 10 segments.
    const window = Math.max(10, Math.ceil(numSegs * 0.15))
    startIdx = lo - window
    endIdx = lo + window
  }

  // Project the car onto each segment in the search range and track
  // the projection with minimum distance.
  for (let j = startIdx; j < endIdx; j++) {
    // Wrap index for closed-track circular search.
    const i = ((j % numSegs) + numSegs) % numSegs

    const ax = referencePath[i].x
    const ay = referencePath[i].y
    const bx = referencePath[i + 1].x
    const by = referencePath[i + 1].y

    const abx = bx - ax
    const aby = by - ay
    const apx = carX - ax
    const apy = carY - ay

    // Parametric projection clamped to [0, 1] along the segment.
    const segLenSq = abx * abx + aby * aby
    let t = segLenSq > 0 ? (apx * abx + apy * aby) / segLenSq : 0
    t = Math.max(0, Math.min(1, t))

    // Closest point on the segment.
    const closestX = ax + t * abx
    const closestY = ay + t * aby
    const dx = carX - closestX
    const dy = carY - closestY
    const distSq = dx * dx + dy * dy

    if (distSq < minDistSq) {
      minDistSq = distSq
      // Arc-length progress: distance to segment start + fraction within segment.
      bestProgress = (lengths[i] + t * (lengths[i + 1] - lengths[i])) / totalLength
    }
  }

  return bestProgress
}

// Computes a point and unit tangent direction at a given progress (0-1) along a path.
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

// Maps a normalised progress value (0–1) onto a display path using arc-length
// parameterisation. Uses binary search on the arc-length table for O(log n) lookup.
// Pass pre-computed arcLengths to avoid recomputing per call on the hot path.
export const mapProgressToPoint = (
  progress: number,
  displayPath: { x: number; y: number }[],
  arcLengths?: number[],
): { x: number; y: number } => {
  if (displayPath.length === 0) return { x: 0, y: 0 }
  if (displayPath.length === 1) return displayPath[0]

  const lengths = arcLengths || computeArcLengths(displayPath)
  const totalLength = lengths[lengths.length - 1]
  if (totalLength === 0) return displayPath[0]

  const clamped = Math.max(0, Math.min(1, progress))
  const targetLength = clamped * totalLength

  // Binary search for the segment containing targetLength.
  let lo = 0
  let hi = displayPath.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (lengths[mid] <= targetLength) lo = mid
    else hi = mid
  }

  const segLength = lengths[hi] - lengths[lo]
  const t = segLength > 0 ? (targetLength - lengths[lo]) / segLength : 0

  // Linearly interpolate between the two bracketing points.
  return {
    x: displayPath[lo].x + (displayPath[hi].x - displayPath[lo].x) * t,
    y: displayPath[lo].y + (displayPath[hi].y - displayPath[lo].y) * t,
  }
}

// Converts a progress value from one path's parameterization to another's.
// Maps source progress → physical coordinates on sourcePath → projection onto targetPath.
// Used to convert sector boundaries computed on baselinePath to the display path.
// Optional hintProgress constrains the target search to avoid nearest-segment ambiguity.
export const convertProgress = (
  sourceProgress: number,
  sourcePath: { x: number; y: number }[],
  sourceArc: number[],
  targetPath: { x: number; y: number }[],
  targetArc: number[],
  hintProgress?: number,
): number => {
  const point = mapProgressToPoint(sourceProgress, sourcePath, sourceArc)
  return computeTrackProgress(point.x, point.y, targetPath, targetArc, hintProgress)
}

// Computes forward distance from a base progress to a target on the circular 0-1 track.
export const forwardDistance = (base: number, target: number): number => {
  const d = target - base
  return d >= 0 ? d : d + 1.0
}
