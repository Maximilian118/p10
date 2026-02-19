import { useRef, useEffect, useCallback, useMemo, MutableRefObject } from "react"
import { CarPosition } from "../../types"
import { computeArcLengths, getPointAtProgress } from "./trackPathUtils"

// Timestamped progress sample stored in each driver's buffer.
interface BufferedSample {
  progress: number
  time: number
}

// Computes the shortest signed delta between two progress values (0-1),
// accounting for wrap-around at the start/finish boundary.
const shortestProgressDelta = (from: number, to: number): number => {
  let delta = to - from
  if (delta > 0.5) delta -= 1.0
  if (delta < -0.5) delta += 1.0
  return delta
}

// Normalizes a progress value into [0, 1).
const normalizeProgress = (p: number): number => ((p % 1.0) + 1.0) % 1.0

// Linearly interpolates between two progress values, accounting for
// wrap-around at the start/finish boundary.
const lerpProgress = (from: number, to: number, t: number): number => {
  const delta = shortestProgressDelta(from, to)
  return normalizeProgress(from + delta * t)
}

// Jitter buffer delay (ms). Renders cars slightly behind real-time so we
// always have data points to interpolate between (same technique as VoIP).
const BUFFER_DELAY = 400
const MAX_BUFFER_SAMPLES = 10
const DEDUP_THRESHOLD = 0.00005

// Maximum backward progress jump allowed before a sample is rejected.
// Larger backward jumps are likely wrong-segment projections on tracks
// where sections run close together (e.g. Shanghai turns 14-16).
const MAX_BACKWARD = 0.04

// Exponential smoothing time constant (ms). Controls how quickly the rendered
// progress chases the interpolated target. Acts as a velocity low-pass filter
// that dampens abrupt speed transitions at corner entry/exit. Higher = smoother
// but laggier.
const SMOOTH_TAU = 250

// Locks car dots to the SVG track path using progress-based arc-length
// parameterization. Uses a jitter buffer for continuous interpolation and
// exponential smoothing for visually smooth velocity transitions.
// Returns a ref-registration callback — zero React render overhead.
const usePathLockedPositions = (
  carPositions: CarPosition[],
  svgTrackPath: { x: number; y: number }[] | null,
): {
  registerDot: (driverNumber: number, element: SVGGElement | null) => void
  smoothedProgressRef: MutableRefObject<Map<number, number>>
} => {
  // Precompute cumulative arc lengths for progress-to-point mapping.
  const arcLengths = useMemo(
    () => (svgTrackPath && svgTrackPath.length > 1 ? computeArcLengths(svgTrackPath) : null),
    [svgTrackPath],
  )

  const buffersRef = useRef<Map<number, BufferedSample[]>>(new Map())
  const dotsRef = useRef<Map<number, SVGGElement>>(new Map())
  const rafRef = useRef<number>(0)

  // Per-driver smoothed progress for exponential velocity smoothing.
  const smoothedRef = useRef<Map<number, number>>(new Map())
  const lastFrameTimeRef = useRef<number>(0)

  // Registers a car dot DOM element for direct rAF-driven transform updates.
  const registerDot = useCallback((driverNumber: number, element: SVGGElement | null) => {
    if (element) {
      dotsRef.current.set(driverNumber, element)
    } else {
      dotsRef.current.delete(driverNumber)
    }
  }, [])

  // Buffer incoming position samples with reception timestamps.
  useEffect(() => {
    const now = performance.now()
    const currentDrivers = new Set<number>()

    carPositions.forEach((car) => {
      if (car.progress === undefined) return
      currentDrivers.add(car.driverNumber)

      let samples = buffersRef.current.get(car.driverNumber)
      if (!samples) {
        samples = []
        buffersRef.current.set(car.driverNumber, samples)
      }

      // Reject large backward jumps (likely wrong-segment projection).
      // Small backward motion (< threshold) is allowed for GPS noise.
      const last = samples[samples.length - 1]
      if (last) {
        const delta = shortestProgressDelta(last.progress, car.progress)
        if (delta < -MAX_BACKWARD) return
      }

      // Deduplicate samples where progress hasn't meaningfully changed.
      if (!last || Math.abs(shortestProgressDelta(last.progress, car.progress)) > DEDUP_THRESHOLD) {
        samples.push({ progress: car.progress, time: now })
        if (samples.length > MAX_BUFFER_SAMPLES) {
          samples.splice(0, samples.length - MAX_BUFFER_SAMPLES)
        }
      }
    })

    // Clean up state for drivers that have left.
    buffersRef.current.forEach((_, dn) => {
      if (!currentDrivers.has(dn)) buffersRef.current.delete(dn)
    })
    smoothedRef.current.forEach((_, dn) => {
      if (!currentDrivers.has(dn)) smoothedRef.current.delete(dn)
    })

  }, [carPositions])

  // rAF animation loop — interpolates buffered progress, applies exponential
  // smoothing, and writes CSS transforms directly to DOM elements.
  useEffect(() => {
    if (!svgTrackPath || !arcLengths) return

    const animate = (now: number): void => {
      const renderTime = now - BUFFER_DELAY

      buffersRef.current.forEach((samples, driverNumber) => {
        const el = dotsRef.current.get(driverNumber)
        if (!el || samples.length === 0) return

        // Find the target progress by interpolating buffered samples.
        let progress: number | null = null

        if (renderTime <= samples[0].time) {
          // Before buffer — clamp to earliest sample.
          progress = samples[0].progress
        } else if (renderTime >= samples[samples.length - 1].time) {
          // Past buffer — clamp to latest sample.
          progress = samples[samples.length - 1].progress
        } else {
          // Find the two samples bracketing renderTime.
          let i = 0
          for (let j = 0; j < samples.length - 1; j++) {
            if (samples[j].time <= renderTime && renderTime < samples[j + 1].time) {
              i = j
              break
            }
          }

          // Linear interpolation between bracketing samples.
          const u = (renderTime - samples[i].time) / (samples[i + 1].time - samples[i].time)
          progress = lerpProgress(samples[i].progress, samples[i + 1].progress, u)
        }

        if (progress === null) return

        // Exponential smoothing: the interpolated progress is the "target" and
        // the rendered progress chases it with a time constant of SMOOTH_TAU.
        // This acts as a velocity low-pass filter, dampening abrupt speed
        // changes from braking/acceleration into smooth visual transitions.
        const frameDt = now - lastFrameTimeRef.current
        if (frameDt > 0 && frameDt < 200) {
          const existing = smoothedRef.current.get(driverNumber)
          if (existing !== undefined) {
            const blend = 1 - Math.exp(-frameDt / SMOOTH_TAU)
            progress = lerpProgress(existing, progress, blend)
          }
        }
        smoothedRef.current.set(driverNumber, progress)

        // Map progress to an on-track SVG point and apply the transform.
        const point = getPointAtProgress(svgTrackPath, arcLengths, progress)
        if (!point) return

        el.style.transform = `translate(${point.x}px, ${point.y}px)`
      })

      lastFrameTimeRef.current = now
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [svgTrackPath, arcLengths])

  return { registerDot, smoothedProgressRef: smoothedRef }
}

export default usePathLockedPositions
