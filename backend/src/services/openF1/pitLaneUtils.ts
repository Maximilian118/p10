import { PitLaneProfile, PitStopSample } from "./types"
import { getPointAndTangentAtProgress } from "./trackProgress"

// ─── Geometry Utilities ──────────────────────────────────────────

// Computes the signed area of a polygon using the shoelace formula.
// Positive = counter-clockwise (in standard math Y-up), Negative = clockwise.
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

// Returns true if the path winds clockwise in math Y-up coordinate space.
export const isClockwise = (path: { x: number; y: number }[]): boolean => {
  return computeSignedArea(path) < 0
}

// ─── Statistics ──────────────────────────────────────────────────

// Computes the median of a numeric array.
export const median = (arr: number[]): number => {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// Computes the median of circular values in the [0, 1) range (e.g., track progress).
// Standard median fails when values straddle the 0/1 boundary (e.g., [0.98, 0.99, 0.01, 0.02]).
// Detects boundary straddling and shifts values to a contiguous range before computing.
export const circularMedian = (arr: number[]): number => {
  if (arr.length <= 1) return arr.length === 1 ? arr[0] : 0

  // Check if values straddle the 0/1 boundary (some < 0.25 and some > 0.75).
  const hasLow = arr.some(v => v < 0.25)
  const hasHigh = arr.some(v => v > 0.75)

  if (hasLow && hasHigh) {
    // Shift values by +0.5 (mod 1.0) to move the boundary away from the cluster.
    const shifted = arr.map(v => (v + 0.5) % 1.0)
    const result = median(shifted)
    return (result + 0.5) % 1.0
  }

  return median(arr)
}

// ─── Constants ──────────────────────────────────────────────────

// Minimum valid pit lane length as a fraction of the track (0-1).
// Even the shortest F1 pit lanes span more than 2% of the circuit.
// Used to detect failed tight detection (sparse data in practice/qualifying).
export const MIN_PIT_PROGRESS_RANGE = 0.02

// ─── Pit Side Detection ─────────────────────────────────────────

// Computes a distance-weighted pit side vote from GPS positions in the pit lane.
// Projects each position onto the nearest track segment, checks which side of the
// perpendicular it falls on, and weights the vote by how far from the track it is.
// Points deeper in the pit lane are more reliable indicators of pit side.
// Optional speed filtering excludes positions where the car is still on track speed.
export const computePitSideVote = (
  pitPositions: { x: number; y: number; speed?: number }[],
  trackPath: { x: number; y: number }[],
  pitLaneSpeedLimit?: number,
): { side: number; rightWeight: number; leftWeight: number; totalPoints: number } => {
  let rightWeight = 0
  let leftWeight = 0
  let totalPoints = 0
  // Only count positions at pit lane speed or below (with margin above limit).
  const maxSpeed = (pitLaneSpeedLimit ?? 100) + 20

  for (const loc of pitPositions) {
    // Skip positions where the car is clearly NOT in the pit lane (still at racing speed).
    // Stationary positions (speed ≈ 0) are kept — a car parked in the pit box is the
    // most definitive indicator of which side the pit building is on.
    if (loc.speed !== undefined && loc.speed > maxSpeed) continue

    // Find the nearest track segment via point-to-segment projection.
    let minDistSq = Infinity
    let bestSegIdx = 0
    let bestT = 0
    for (let i = 0; i < trackPath.length - 1; i++) {
      const ax = trackPath[i].x, ay = trackPath[i].y
      const bx = trackPath[i + 1].x, by = trackPath[i + 1].y
      const abx = bx - ax, aby = by - ay
      const apx = loc.x - ax, apy = loc.y - ay
      const segLenSq = abx * abx + aby * aby
      let t = segLenSq > 0 ? (apx * abx + apy * aby) / segLenSq : 0
      t = Math.max(0, Math.min(1, t))
      const cx = ax + t * abx, cy = ay + t * aby
      const dSq = (loc.x - cx) * (loc.x - cx) + (loc.y - cy) * (loc.y - cy)
      if (dSq < minDistSq) {
        minDistSq = dSq
        bestSegIdx = i
        bestT = t
      }
    }

    // Tangent direction along the track at the closest point.
    const ax = trackPath[bestSegIdx].x, ay = trackPath[bestSegIdx].y
    const bx = trackPath[bestSegIdx + 1].x, by = trackPath[bestSegIdx + 1].y
    const tx = bx - ax, ty = by - ay
    const tLen = Math.sqrt(tx * tx + ty * ty)
    if (tLen === 0) continue

    // Right perpendicular in GPS coords (Y-up): (ty, -tx).
    const perpX = ty / tLen, perpY = -tx / tLen
    // Closest track point.
    const closestX = ax + bestT * (bx - ax)
    const closestY = ay + bestT * (by - ay)
    // Offset vector from track to pit GPS position.
    const offX = loc.x - closestX, offY = loc.y - closestY
    // Signed perpendicular distance: positive = right side, negative = left side.
    const dot = offX * perpX + offY * perpY
    // Weight by perpendicular distance — points deeper in the pit lane are more reliable.
    const dist = Math.abs(dot)
    if (dist > 1) {
      totalPoints++
      if (dot > 0) rightWeight += dist
      else leftWeight += dist
    }
  }

  return {
    side: rightWeight >= leftWeight ? 1 : -1,
    rightWeight,
    leftWeight,
    totalPoints,
  }
}

// ─── Pit Building Boundaries ────────────────────────────────────

// Margin (km/h) above the detected pit lane speed limit for entry/exit detection.
// Accounts for measurement noise — a car at 88 km/h with an 80 km/h limit is still in the pit lane.
export const PIT_SPEED_MARGIN = 10

// ─── Track Centroid Heuristic ────────────────────────────────────

// Determines which side of the track the infield (centroid) is on at a given progress.
// Returns +1 (right) or -1 (left), matching the pitSide convention.
// Pit lanes are virtually always on the infield side of the circuit.
export const computeInfieldSide = (
  trackPath: { x: number; y: number }[],
  arcLengths: number[],
  progress: number,
): number => {
  // Compute track centroid (average of all path vertices).
  let cx = 0, cy = 0
  for (const p of trackPath) { cx += p.x; cy += p.y }
  cx /= trackPath.length; cy /= trackPath.length

  // Get point and tangent at the given progress along the track.
  const pt = getPointAndTangentAtProgress(trackPath, arcLengths, progress)
  if (!pt) return 1

  // Right perpendicular in Y-up coords: (ty, -tx).
  const tx = pt.tangent.dx, ty = pt.tangent.dy
  const perpX = ty, perpY = -tx

  // Dot product of (centroid - trackPoint) with the perpendicular.
  // Positive = centroid is on the right side, Negative = centroid is on the left side.
  const dot = (cx - pt.point.x) * perpX + (cy - pt.point.y) * perpY
  return dot >= 0 ? 1 : -1
}

// ─── Profile Builder ─────────────────────────────────────────────

// Detects the pit lane speed limit from observed pit lane speeds.
// Buckets speeds into 5 km/h bins and returns the center of the most populated bin.
const detectSpeedLimitFromSpeeds = (speeds: number[]): number => {
  if (speeds.length === 0) return 80
  const binSize = 5
  const bins = new Map<number, number>()
  for (const s of speeds) {
    const bin = Math.round(s / binSize) * binSize
    bins.set(bin, (bins.get(bin) ?? 0) + 1)
  }
  let bestBin = 80
  let bestCount = 0
  bins.forEach((count, bin) => {
    if (count > bestCount) {
      bestCount = count
      bestBin = bin
    }
  })
  return bestBin
}

// Builds a PitLaneProfile from accumulated pit stop samples and speed data.
// Used by the live progressive builder in sessionManager.ts.
// Returns null if no samples are available.
export const buildProfileFromSamples = (
  samples: PitStopSample[],
  pitLaneSpeeds: number[],
  referencePath: { x: number; y: number }[],
  infieldSide?: number,
): PitLaneProfile | null => {
  if (samples.length === 0) return null

  const entryProgressValues = samples.map(s => s.entryProgress)
  const exitProgressValues = samples.map(s => s.exitProgress)
  const exitSpeedValues = samples.map(s => s.exitSpeed)

  const detectedLimit = detectSpeedLimitFromSpeeds(pitLaneSpeeds)

  // Compute pit side from distance-weighted GPS votes across all samples.
  // Points further from the racing line carry more weight (deeper in pit lane = more reliable).
  const totalRight = samples.reduce((sum, s) => sum + s.pitSideRightWeight, 0)
  const totalLeft = samples.reduce((sum, s) => sum + s.pitSideLeftWeight, 0)
  const totalWeight = totalRight + totalLeft
  const pitSide = totalRight >= totalLeft ? 1 : -1
  let pitSideConfidence = totalWeight > 0 ? Math.max(totalRight, totalLeft) / totalWeight : 0

  // If GPS-based side disagrees with the infield heuristic (centroid side), halve the confidence.
  // This prevents rendering a pit building on the wrong side when GPS data is poor.
  if (infieldSide !== undefined && pitSide !== infieldSide) {
    pitSideConfidence *= 0.5
  }

  return {
    entryProgress: circularMedian(entryProgressValues),
    exitProgress: circularMedian(exitProgressValues),
    exitSpeed: exitSpeedValues.length > 0 ? median(exitSpeedValues) : detectedLimit + 20,
    pitLaneMaxSpeed: pitLaneSpeeds.length > 0 ? Math.max(...pitLaneSpeeds) : detectedLimit,
    pitLaneSpeedLimit: detectedLimit,
    pitSide,
    pitSideConfidence,
    samplesCollected: samples.length,
    referenceWindingCW: isClockwise(referencePath),
  }
}
