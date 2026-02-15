// Computes sector boundary positions by correlating lap sector timings
// with car GPS location messages. For each completed lap with all three
// sector durations, timestamps for the S1→S2 and S2→S3 boundaries are
// derived, and the car's position at each timestamp is found by interpolating
// between bracketing location messages. The positions are then mapped to
// track progress values (0–1) and averaged across many laps for accuracy.

import { OpenF1LapMsg } from "./types"
import { computeTrackProgress } from "./trackProgress"
import { createLogger } from "../../shared/logger"

const log = createLogger("Sectors")

// Sector boundary positions stored as track progress values (0–1).
// Optional GPS coordinates store the raw interpolated car positions at each
// boundary crossing (median across laps). Used for direct projection onto
// MultiViewer paths, bypassing baselinePath to avoid nearest-segment ambiguity.
export interface SectorBoundaries {
  startFinish: number
  sector1_2: number
  sector2_3: number
  startFinishGps?: { x: number; y: number }
  sector1_2Gps?: { x: number; y: number }
  sector2_3Gps?: { x: number; y: number }
}

// Minimum number of valid crossings per boundary before the result is reliable.
const MIN_CROSSINGS = 3

// ─── Position Interpolation ──────────────────────────────────────

// Interpolates a GPS position at a given timestamp from a chronologically
// sorted array of location points. Returns null if the timestamp falls
// outside the data range or no bracketing pair is found.
const interpolatePosition = (
  targetMs: number,
  positions: { x: number; y: number; date: string }[],
): { x: number; y: number } | null => {
  if (positions.length === 0) return null

  // Binary search for the first position with date >= targetMs.
  let lo = 0
  let hi = positions.length - 1

  // Quick bounds check — target is outside the data range.
  const firstMs = new Date(positions[0].date).getTime()
  const lastMs = new Date(positions[positions.length - 1].date).getTime()
  if (targetMs < firstMs || targetMs > lastMs) return null

  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (new Date(positions[mid].date).getTime() < targetMs) {
      lo = mid + 1
    } else {
      hi = mid
    }
  }

  // lo is the index of the first position at or after targetMs.
  // The bracketing pair is (lo - 1, lo).
  if (lo === 0) return positions[0]

  const before = positions[lo - 1]
  const after = positions[lo]
  const beforeMs = new Date(before.date).getTime()
  const afterMs = new Date(after.date).getTime()
  const span = afterMs - beforeMs

  // Exact match or zero span — return the point directly.
  if (span === 0) return { x: before.x, y: before.y }

  // Linearly interpolate between the two bracketing positions.
  const t = (targetMs - beforeMs) / span
  return {
    x: before.x + (after.x - before.x) * t,
    y: before.y + (after.y - before.y) * t,
  }
}

// ─── Circular Median ─────────────────────────────────────────────

// Computes the median of an array of numbers.
const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// Computes the circular median for progress values that may wrap around 0/1.
// If the range of values exceeds 0.5, shifts values below 0.5 up by 1.0 before
// computing the median, then wraps the result back to [0, 1].
const circularMedian = (values: number[]): number => {
  if (values.length === 0) return 0
  const min = Math.min(...values)
  const max = Math.max(...values)

  // No wrap-around — regular median is fine.
  if (max - min <= 0.5) return median(values)

  // Wrap-around detected — shift values below 0.5 up by 1.0.
  const unwrapped = values.map((v) => (v < 0.5 ? v + 1.0 : v))
  const med = median(unwrapped)
  return med >= 1.0 ? med - 1.0 : med
}

// ─── Public API ──────────────────────────────────────────────────

// Computes sector boundary progress values from lap timing and location data.
// Returns null if insufficient data is available for reliable computation.
export const computeSectorBoundaries = (
  laps: OpenF1LapMsg[],
  positionsByDriver: Map<number, { x: number; y: number; date: string }[]>,
  referencePath: { x: number; y: number }[],
): SectorBoundaries | null => {
  if (referencePath.length < 10) {
    log.info(`Reference path too short: ${referencePath.length} points (need 10)`)
    return null
  }

  const startFinishProgresses: number[] = []
  const s1_2Progresses: number[] = []
  const s2_3Progresses: number[] = []

  // Raw GPS coordinates of each boundary crossing for direct MultiViewer projection.
  const sfXs: number[] = [], sfYs: number[] = []
  const s12Xs: number[] = [], s12Ys: number[] = []
  const s23Xs: number[] = [], s23Ys: number[] = []

  // Diagnostic counters for understanding data availability.
  let totalLaps = 0
  let skippedIncomplete = 0
  let skippedPitOut = 0
  let skippedNoGps = 0
  let skippedFewGps = 0
  let interpolationMisses = 0

  // For each lap with complete sector data, derive boundary timestamps and positions.
  for (const lap of laps) {
    totalLaps++

    if (!lap.date_start || !lap.duration_sector_1 || !lap.duration_sector_2 || !lap.duration_sector_3) {
      skippedIncomplete++
      continue
    }
    if (lap.is_pit_out_lap) {
      skippedPitOut++
      continue
    }

    const driverPositions = positionsByDriver.get(lap.driver_number)
    if (!driverPositions) {
      skippedNoGps++
      continue
    }
    if (driverPositions.length < 10) {
      skippedFewGps++
      continue
    }

    const lapStartMs = new Date(lap.date_start).getTime()
    const s1EndMs = lapStartMs + lap.duration_sector_1 * 1000
    const s2EndMs = s1EndMs + lap.duration_sector_2 * 1000

    // Interpolate car position at each boundary timestamp.
    const startPos = interpolatePosition(lapStartMs, driverPositions)
    const s1_2Pos = interpolatePosition(s1EndMs, driverPositions)
    const s2_3Pos = interpolatePosition(s2EndMs, driverPositions)

    if (!startPos || !s1_2Pos || !s2_3Pos) {
      interpolationMisses++
    }

    // Map each position to track progress and collect raw GPS coordinates.
    if (startPos) {
      startFinishProgresses.push(computeTrackProgress(startPos.x, startPos.y, referencePath))
      sfXs.push(startPos.x); sfYs.push(startPos.y)
    }
    if (s1_2Pos) {
      s1_2Progresses.push(computeTrackProgress(s1_2Pos.x, s1_2Pos.y, referencePath))
      s12Xs.push(s1_2Pos.x); s12Ys.push(s1_2Pos.y)
    }
    if (s2_3Pos) {
      s2_3Progresses.push(computeTrackProgress(s2_3Pos.x, s2_3Pos.y, referencePath))
      s23Xs.push(s2_3Pos.x); s23Ys.push(s2_3Pos.y)
    }
  }

  // Log filtering summary and crossing counts for diagnostics.
  log.info(
    `Sector analysis: ${totalLaps} laps — ${skippedIncomplete} incomplete, ${skippedPitOut} pit-out, ` +
    `${skippedNoGps} no GPS, ${skippedFewGps} few GPS, ${interpolationMisses} interpolation miss`,
  )
  log.info(
    `Crossings: S/F=${startFinishProgresses.length}, S1/S2=${s1_2Progresses.length}, ` +
    `S2/S3=${s2_3Progresses.length} (need ${MIN_CROSSINGS} each)`,
  )

  // Require minimum crossings for reliability.
  if (startFinishProgresses.length < MIN_CROSSINGS
    || s1_2Progresses.length < MIN_CROSSINGS
    || s2_3Progresses.length < MIN_CROSSINGS) {
    log.info("Insufficient crossings — cannot compute sectors")
    return null
  }

  // Use circular median for progress and standard median for GPS coordinates.
  return {
    startFinish: circularMedian(startFinishProgresses),
    sector1_2: circularMedian(s1_2Progresses),
    sector2_3: circularMedian(s2_3Progresses),
    startFinishGps: { x: median(sfXs), y: median(sfYs) },
    sector1_2Gps: { x: median(s12Xs), y: median(s12Ys) },
    sector2_3Gps: { x: median(s23Xs), y: median(s23Ys) },
  }
}
