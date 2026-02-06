import { ValidatedLap, OpenF1LapMsg } from "./types"

// Maximum percentage of best lap time to be considered a "fast" lap.
const FAST_LAP_THRESHOLD = 1.07

// Number of standard deviations for outlier detection.
const OUTLIER_STD_DEVS = 2

// Keep every Nth point when downsampling the track path for rendering.
const DOWNSAMPLE_FACTOR = 3

// Window size for moving-average smoothing.
const SMOOTHING_WINDOW = 5

// Distance threshold for comparing track maps (coordinate units).
// If mean nearest-neighbour distance exceeds this, tracks are considered different layouts.
const TRACK_CHANGE_THRESHOLD = 500

// ─── Fast Lap Filtering ──────────────────────────────────────────

// Filters completed laps to only include valid "fast" laps suitable for track map construction.
// Excludes pit-out laps, incomplete laps, and laps slower than 107% of the best.
export const filterFastLaps = (
  laps: OpenF1LapMsg[],
  bestLapTime: number,
): OpenF1LapMsg[] => {
  return laps.filter((lap) => {
    // Exclude pit-out laps.
    if (lap.is_pit_out_lap) return false
    // Require all three sector times (complete lap).
    if (!lap.duration_sector_1 || !lap.duration_sector_2 || !lap.duration_sector_3) return false
    // Require a valid total lap duration.
    if (!lap.lap_duration || lap.lap_duration <= 0) return false
    // Only include laps within 107% of the best lap time.
    // When bestLapTime is 0 (no laps yet), the check is skipped — the first valid lap
    // always passes. Subsequent rebuilds re-filter ALL laps, so slow outliers self-correct.
    if (bestLapTime > 0 && lap.lap_duration > bestLapTime * FAST_LAP_THRESHOLD) return false
    return true
  })
}

// ─── Outlier Detection ───────────────────────────────────────────

// Computes the median of an array of numbers.
const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// Computes the standard deviation of an array of numbers.
const stdDev = (values: number[], mean: number): number => {
  const squaredDiffs = values.map((v) => (v - mean) ** 2)
  return Math.sqrt(squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length)
}

// Removes outlier positions from a set of laps by segmenting the track.
// Splits the track into segments based on normalized progress, computes the median
// position for each segment, and excludes points that deviate by > 2 std deviations.
const removeOutliers = (
  laps: ValidatedLap[],
): ValidatedLap[] => {
  if (laps.length === 0) return []

  // Collect all positions across all laps with their progress fraction (0..1).
  const allPositionsWithProgress: { x: number; y: number; lapIdx: number; posIdx: number; progress: number }[] = []

  laps.forEach((lap, lapIdx) => {
    const totalPositions = lap.positions.length
    lap.positions.forEach((pos, posIdx) => {
      allPositionsWithProgress.push({
        x: pos.x,
        y: pos.y,
        lapIdx,
        posIdx,
        progress: totalPositions > 1 ? posIdx / (totalPositions - 1) : 0,
      })
    })
  })

  // Divide the track into 100 segments.
  const numSegments = 100
  const segmentSize = 1 / numSegments

  // For each segment, compute median and std dev, mark outliers.
  const outlierSet = new Set<string>()

  for (let s = 0; s < numSegments; s++) {
    const segStart = s * segmentSize
    const segEnd = (s + 1) * segmentSize

    const segmentPositions = allPositionsWithProgress.filter(
      (p) => p.progress >= segStart && p.progress < segEnd,
    )

    if (segmentPositions.length < 3) continue

    const xValues = segmentPositions.map((p) => p.x)
    const yValues = segmentPositions.map((p) => p.y)

    const medX = median(xValues)
    const medY = median(yValues)
    const stdX = stdDev(xValues, medX)
    const stdY = stdDev(yValues, medY)

    // Mark positions outside 2 std deviations as outliers.
    segmentPositions.forEach((p) => {
      const xDev = stdX > 0 ? Math.abs(p.x - medX) / stdX : 0
      const yDev = stdY > 0 ? Math.abs(p.y - medY) / stdY : 0

      if (xDev > OUTLIER_STD_DEVS || yDev > OUTLIER_STD_DEVS) {
        outlierSet.add(`${p.lapIdx}-${p.posIdx}`)
      }
    })
  }

  // Return laps with outlier positions removed.
  return laps.map((lap, lapIdx) => ({
    ...lap,
    positions: lap.positions.filter((_, posIdx) => !outlierSet.has(`${lapIdx}-${posIdx}`)),
  }))
}

// ─── Path Construction ───────────────────────────────────────────

// Downsamples an array of points by keeping every Nth point.
// Always preserves the first and last points.
const downsample = (points: { x: number; y: number }[]): { x: number; y: number }[] => {
  if (points.length <= DOWNSAMPLE_FACTOR) return points

  const result: { x: number; y: number }[] = []
  for (let i = 0; i < points.length; i += DOWNSAMPLE_FACTOR) {
    result.push(points[i])
  }

  // Ensure the last point is included.
  const lastPoint = points[points.length - 1]
  if (result[result.length - 1] !== lastPoint) {
    result.push(lastPoint)
  }

  return result
}

// Applies a circular moving-average smoothing to reduce GPS jitter.
// Uses wrap-around indexing so the start and end of the circuit blend seamlessly.
const smooth = (points: { x: number; y: number }[]): { x: number; y: number }[] => {
  if (points.length <= SMOOTHING_WINDOW) return points

  const halfWindow = Math.floor(SMOOTHING_WINDOW / 2)

  return points.map((_, i) => {
    let sumX = 0
    let sumY = 0
    for (let j = -halfWindow; j <= halfWindow; j++) {
      const idx = ((i + j) % points.length + points.length) % points.length
      sumX += points[idx].x
      sumY += points[idx].y
    }

    return { x: sumX / SMOOTHING_WINDOW, y: sumY / SMOOTHING_WINDOW }
  })
}

// Builds the track path from validated fast-lap position data.
// Takes the best lap (most positions) as the baseline and applies
// median-based outlier detection across all laps.
export const buildTrackPath = (
  validatedLaps: ValidatedLap[],
): { x: number; y: number }[] => {
  if (validatedLaps.length === 0) return []

  // Remove outliers across all laps.
  const cleanedLaps = removeOutliers(validatedLaps)

  // Find the lap with the most remaining positions (best quality data).
  const bestLap = cleanedLaps.reduce((best, lap) =>
    lap.positions.length > best.positions.length ? lap : best,
  )

  if (bestLap.positions.length === 0) return []

  // Order positions by their original timestamp.
  const orderedPositions = bestLap.positions
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((p) => ({ x: p.x, y: p.y }))

  // Downsample and smooth for rendering.
  const downsampled = downsample(orderedPositions)
  const smoothed = smooth(downsampled)

  return smoothed
}

// ─── Track Map Comparison ────────────────────────────────────────

// Computes the mean nearest-neighbour distance between two track paths.
// Low distance = same track layout, high distance = different layout.
export const compareTrackMaps = (
  pathA: { x: number; y: number }[],
  pathB: { x: number; y: number }[],
): number => {
  if (pathA.length === 0 || pathB.length === 0) return Infinity

  // Sample points at equal intervals along both paths.
  const sampleCount = Math.min(50, pathA.length, pathB.length)
  const sampleA = sampleEqually(pathA, sampleCount)
  const sampleB = sampleEqually(pathB, sampleCount)

  // For each point in A, find the nearest point in B.
  let totalDistance = 0
  sampleA.forEach((a) => {
    let minDist = Infinity
    sampleB.forEach((b) => {
      const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
      if (dist < minDist) minDist = dist
    })
    totalDistance += minDist
  })

  return totalDistance / sampleCount
}

// Returns whether two track maps are sufficiently different to warrant regeneration.
export const hasTrackLayoutChanged = (
  pathA: { x: number; y: number }[],
  pathB: { x: number; y: number }[],
): boolean => {
  return compareTrackMaps(pathA, pathB) > TRACK_CHANGE_THRESHOLD
}

// Samples N equally-spaced points from a path.
const sampleEqually = (
  path: { x: number; y: number }[],
  count: number,
): { x: number; y: number }[] => {
  if (path.length <= count) return [...path]

  const result: { x: number; y: number }[] = []
  const step = (path.length - 1) / (count - 1)

  for (let i = 0; i < count; i++) {
    const idx = Math.round(i * step)
    result.push(path[idx])
  }

  return result
}

// ─── Refinement Schedule ─────────────────────────────────────────

// Determines whether the track map should be updated based on total laps processed.
// Updates become less frequent as confidence grows.
export const shouldUpdate = (totalLapsProcessed: number, lastUpdateLap: number): boolean => {
  const lapsSinceUpdate = totalLapsProcessed - lastUpdateLap

  if (totalLapsProcessed < 5) return lapsSinceUpdate >= 1
  if (totalLapsProcessed < 10) return lapsSinceUpdate >= 2
  if (totalLapsProcessed < 20) return lapsSinceUpdate >= 5
  return lapsSinceUpdate >= 10
}
