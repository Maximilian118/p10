import React, { useMemo, useEffect, useRef, useCallback, useState } from "react"
import useTrackmap from "../../useTrackmap"
import usePathLockedPositions from "./usePathLockedPositions"

import { computeArcLengths, getPointAndTangentAtProgress, getPointAtProgress, getSubPath, buildOpenSvgPath, computeSignedArea } from "./trackPathUtils"
import { DriverLiveState, SessionLiveState, SectorBoundaries, RaceControlEvent } from "../../types"
import { segmentColor, forwardDistance, AcceptedSegments } from "../../openF1Utility"
import "./_trackmap.scss"

interface TrackmapProps {
  selectedDriverNumber?: number | null
  onDriverSelect?: (driver: { driverNumber: number } | null) => void
  onDriverStatesUpdate?: (states: DriverLiveState[]) => void
  demoMode?: boolean
  onTrackReady?: () => void
  onSessionInfo?: (info: { trackName: string; sessionName: string }) => void
  rotationDelta?: number
  onRotationSave?: (trackName: string, rotation: number) => void
  trackFlag?: string | null
  onPillSegments?: (map: Map<number, AcceptedSegments>) => void
  onWeatherUpdate?: (weather: SessionLiveState["weather"]) => void
  onRaceControlUpdate?: (messages: RaceControlEvent[]) => void
}

interface CarDotProps {
  driverNumber: number
  x: number
  y: number
  teamColour: string
  dotRadius: number
  strokeWidth: number
  isNew: boolean
  pathLocked: boolean
  hidden: boolean
  flagColor: string | null
  onSelect?: (driverNumber: number) => void
}

// Renders a single car dot positioned via CSS transform.
// In CSS mode: `transition: transform 800ms linear` handles smooth interpolation.
// In path-locked mode: rAF loop writes transform directly to the DOM element via
// the forwarded ref — React does not set style.transform (rAF is sole owner).
// When hidden, the dot is invisible but stays in the DOM so rAF keeps updating it.
const CarDot = React.memo(React.forwardRef<SVGGElement, CarDotProps>(({
  driverNumber, x, y, teamColour,
  dotRadius, strokeWidth, isNew, pathLocked, hidden, flagColor, onSelect,
}, ref) => {
  // Build class name based on mode and visibility.
  let className = "car-dot-group"
  if (isNew) className += " car-dot-group--no-transition"
  else if (pathLocked) className += " car-dot-group--path-locked"
  if (hidden) className += " car-dot-group--hidden"

  // Build circle class — adds flag flash animation when a driver flag is active.
  let circleClass = "car-dot"
  if (flagColor === "BLUE") circleClass += " car-dot--flag-blue"

  return (
    <g
      ref={ref}
      className={className}
      style={pathLocked ? undefined : { transform: `translate(${x}px, ${y}px)` }}
    >
      <circle
        r={dotRadius}
        fill={`#${teamColour}`}
        stroke="#ffffff"
        strokeWidth={strokeWidth}
        className={circleClass}
        onClick={() => onSelect?.(driverNumber)}
      />
    </g>
  )
}), (prev, next) =>
  prev.x === next.x
  && prev.y === next.y
  && prev.teamColour === next.teamColour
  && prev.dotRadius === next.dotRadius
  && prev.isNew === next.isNew
  && prev.pathLocked === next.pathLocked
  && prev.hidden === next.hidden
  && prev.flagColor === next.flagColor
)

// Converts an array of {x, y} points into an SVG path string.
const buildSvgPath = (path: { x: number; y: number }[]): string => {
  if (path.length === 0) return ""
  const [first, ...rest] = path
  return `M ${first.x},${first.y} ${rest.map((p) => `L ${p.x},${p.y}`).join(" ")} Z`
}

// Rotates a point around a centre by the given angle in radians.
const rotatePoint = (
  px: number, py: number,
  cx: number, cy: number,
  rad: number,
): { x: number; y: number } => {
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = px - cx
  const dy = py - cy
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos }
}

// Uses PCA to find the optimal rotation angle (degrees) that orients the track
// so its longest extent aligns horizontally — ideal for a landscape container.
const computeRotationAngle = (path: { x: number; y: number }[]): number => {
  if (path.length < 3) return 0

  const n = path.length

  // Compute centroid.
  const cx = path.reduce((sum, p) => sum + p.x, 0) / n
  const cy = path.reduce((sum, p) => sum + p.y, 0) / n

  // Compute covariance matrix components.
  let cxx = 0
  let cyy = 0
  let cxy = 0
  path.forEach((p) => {
    const dx = p.x - cx
    const dy = p.y - cy
    cxx += dx * dx
    cyy += dy * dy
    cxy += dx * dy
  })

  // Principal axis angle — direction of maximum variance.
  const theta = 0.5 * Math.atan2(2 * cxy, cxx - cyy)

  // Rotate by -θ to align principal axis with horizontal.
  return -theta * (180 / Math.PI)
}

// Computes the centroid of a path.
const computeCentroid = (path: { x: number; y: number }[]): { cx: number; cy: number } => {
  const n = path.length
  const cx = path.reduce((sum, p) => sum + p.x, 0) / n
  const cy = path.reduce((sum, p) => sum + p.y, 0) / n
  return { cx, cy }
}

// Computes the SVG viewBox from the track path after applying rotation.
// Uses track path only (not car positions) so the view stays stable.
const computeViewBox = (
  path: { x: number; y: number }[],
  angleDeg: number,
  cx: number,
  cy: number,
): string => {
  if (path.length === 0) return "0 0 100 100"

  const rad = angleDeg * (Math.PI / 180)

  // Rotate all track points to find the rotated bounding box.
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  path.forEach((p) => {
    const rp = rotatePoint(p.x, p.y, cx, cy, rad)
    if (rp.x < minX) minX = rp.x
    if (rp.x > maxX) maxX = rp.x
    if (rp.y < minY) minY = rp.y
    if (rp.y > maxY) maxY = rp.y
  })

  // Add 10% padding on all sides.
  const width = maxX - minX || 1
  const height = maxY - minY || 1
  const padX = width * 0.1
  const padY = height * 0.1

  return `${minX - padX} ${minY - padY} ${width + padX * 2} ${height + padY * 2}`
}

// Computes car dot radius proportional to the track's coordinate scale.
const computeDotRadius = (path: { x: number; y: number }[] | null): number => {
  if (!path || path.length < 2) return 150

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  path.forEach((p) => {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  })

  const trackExtent = Math.max(maxX - minX, maxY - minY) || 1
  // Dot radius is ~1.5% of the track extent.
  return Math.max(50, trackExtent * 0.015)
}



// Stamps segment values into the write-once buffer for segments the car has passed.
// A slot is stamped only if it is null (unvisited), the car's lapDist has reached
// the segment's end, and the raw value is non-zero (data available). Returns true
// if any slot was newly stamped.
// Note: Mini-sector counts vary by track and by sector (typically 5–12 per sector).
const acceptSegments = (
  buffer: AcceptedSegments,
  rawSegments: { sector1: number[]; sector2: number[]; sector3: number[] },
  boundaries: SectorBoundaries,
  lapDist: number,
): boolean => {
  let changed = false
  const lapBase = boundaries.startFinish

  const sectors: { key: keyof AcceptedSegments; start: number; end: number; segs: number[] }[] = [
    { key: "sector1", start: boundaries.startFinish, end: boundaries.sector1_2, segs: rawSegments.sector1 },
    { key: "sector2", start: boundaries.sector1_2, end: boundaries.sector2_3, segs: rawSegments.sector2 },
    { key: "sector3", start: boundaries.sector2_3, end: boundaries.startFinish, segs: rawSegments.sector3 },
  ]

  sectors.forEach(({ key, start, end, segs }) => {
    if (segs.length === 0) return
    let sectorLen = end - start
    if (sectorLen <= 0) sectorLen += 1.0
    const miniLen = sectorLen / segs.length

    segs.forEach((value, i) => {
      if (buffer[key][i] !== null) return
      if (value === 0) return

      // Stamp when the car reaches the segment's end (colours on exit, not entry).
      let segEnd = start + (i + 1) * miniLen
      if (segEnd >= 1.0) segEnd -= 1.0
      let segEndDist = forwardDistance(lapBase, segEnd)
      // S3's last segment ends at the startFinish line — treat as full lap distance.
      if (segEndDist < 0.001) segEndDist = 1.0

      if (lapDist >= segEndDist) {
        buffer[key][i] = value
        changed = true
      }
    })
  })

  return changed
}

// Renders a live F1 track map as SVG with car position dots.
// The track outline is rendered from a precomputed path (from the backend),
// and car positions are overlaid as coloured circles animated via CSS transitions.
// The track is rotated via PCA to fill a landscape container optimally.
const Trackmap: React.FC<TrackmapProps> = ({ selectedDriverNumber, onDriverSelect, onDriverStatesUpdate, demoMode, onTrackReady, onSessionInfo, rotationDelta, onRotationSave, trackFlag: trackFlagProp, onPillSegments, onWeatherUpdate, onRaceControlUpdate }) => {
  const {
    trackPath, carPositions, sessionActive, trackName, sessionName,
    driverStates, sessionState, corners, sectorBoundaries, pitLaneProfile, rotationOverride, connectionStatus,
    driverFlags, trackFlag: hookTrackFlag,
  } = useTrackmap(demoMode)

  // Prefer the hook's direct socket listener; fall back to the prop if available.
  const trackFlag = hookTrackFlag ?? trackFlagProp
  const trackReadyFired = useRef(false)

  // Tracks which drivers have rendered at least once. On initial appearance
  // the transition is suppressed so dots don't slide from the SVG origin.
  const seenDrivers = useRef<Set<number>>(new Set())

  // Negate Y to convert from math coordinates (Y-up) to SVG coordinates (Y-down).
  // Snap last point to first for a zero-gap closure, then append a duplicate first point
  // so arc-length parameterisation wraps smoothly at the S/F boundary.
  // Rendering uses slice(0, -1) to avoid a doubled closing segment with the SVG Z command.
  const svgTrackPath = useMemo(
    () => {
      if (!trackPath) return null
      const path = trackPath.map((p) => ({ x: p.x, y: -p.y }))
      if (path.length > 1) {
        path[path.length - 1] = { ...path[0] }
        path.push({ ...path[0] })
      }
      return path
    },
    [trackPath],
  )

  const svgCarPositions = useMemo(
    () => carPositions.map((c) => ({ ...c, y: -c.y })),
    [carPositions],
  )

  // Detect path-locked mode: backend sends progress values when MultiViewer is active.
  const hasProgress = carPositions.some((c) => c.progress !== undefined)

  // Path-locked animation: rAF loop writes transforms directly to DOM elements.
  // Returns a ref-registration callback (no React state — zero render overhead).
  const { registerDot, smoothedProgressRef } = usePathLockedPositions(
    hasProgress ? carPositions : [],
    hasProgress ? svgTrackPath : null,
  )

  // Write-once segment buffer: each slot is null until the car dot passes it,
  // then stamped with the color value. Clears on S/F crossing.
  const [acceptedSegments, setAcceptedSegments] = useState<AcceptedSegments>(
    { sector1: [], sector2: [], sector3: [] },
  )
  const prevSectorRef = useRef(-1)
  const prevSelectedRef = useRef<number | null>(null)

  // Stable ref callback map — returns the same function reference for a given
  // driver number across renders, preventing React from unregistering/re-registering
  // DOM elements on every position update.
  const dotRefCallbacks = useRef<Map<number, (el: SVGGElement | null) => void>>(new Map())
  const getDotRef = useCallback((driverNumber: number) => {
    let cb = dotRefCallbacks.current.get(driverNumber)
    if (!cb) {
      cb = (el: SVGGElement | null) => registerDot(driverNumber, el)
      dotRefCallbacks.current.set(driverNumber, cb)
    }
    return cb
  }, [registerDot])

  // Forwards a car dot click to the parent as a driver selection event.
  const handleCarClick = useCallback((driverNumber: number) => {
    onDriverSelect?.({ driverNumber })
  }, [onDriverSelect])

  // Deselects the current driver when clicking the SVG background.
  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).tagName === "svg") {
      onDriverSelect?.(null)
    }
  }, [onDriverSelect])

  // No data state.
  const hasData = svgTrackPath && svgTrackPath.length > 0

  // Fire the onTrackReady callback once when track data first arrives.
  useEffect(() => {
    if (hasData && !trackReadyFired.current) {
      trackReadyFired.current = true
      onTrackReady?.()
    }
  }, [hasData, onTrackReady])

  // Forward session info (track name + session name) to the parent component.
  useEffect(() => {
    if (trackName) {
      onSessionInfo?.({ trackName, sessionName })
    }
  }, [trackName, sessionName, onSessionInfo])

  // Forward driver live states to the parent component.
  useEffect(() => {
    onDriverStatesUpdate?.(driverStates)
  }, [driverStates, onDriverStatesUpdate])

  // Forward weather data to the parent component.
  useEffect(() => {
    onWeatherUpdate?.(sessionState?.weather ?? null)
  }, [sessionState?.weather, onWeatherUpdate])

  // Forward race control messages to the parent component.
  useEffect(() => {
    onRaceControlUpdate?.(sessionState?.raceControlMessages ?? [])
  }, [sessionState?.raceControlMessages, onRaceControlUpdate])

  // Clean up seenDrivers when drivers leave so that re-appearing drivers
  // get the no-transition initial placement again.
  useEffect(() => {
    const currentDrivers = new Set(svgCarPositions.map((c) => c.driverNumber))
    seenDrivers.current.forEach((dn) => {
      if (!currentDrivers.has(dn)) seenDrivers.current.delete(dn)
    })
  }, [svgCarPositions])

  // Computes exit-based accepted segments for ALL drivers using the visual car dot
  // position (smoothedProgressRef). Fires the onPillSegments callback at 1 Hz (aligned
  // with driverStates emission) so MiniSectors pills colour exactly when the car dot
  // crosses each mini-sector line. Buffers persist per driver/lap and reset on S/F crossing.
  const pillSegmentsRef = useRef<Map<number, { lap: number; segments: AcceptedSegments }>>(new Map())
  const pillSectorTracker = useRef<Map<number, number>>(new Map())

  useEffect(() => {
    if (!sectorBoundaries || driverStates.length === 0) return

    // Compute the track's canonical segment counts (max per sector across all drivers).
    // Retired/DNF drivers may have fewer segment entries, so we use the max to ensure
    // every driver's pill buffer has the correct number of slots for this track.
    const trackSegCounts = { sector1: 0, sector2: 0, sector3: 0 }
    driverStates.forEach((ds) => {
      trackSegCounts.sector1 = Math.max(trackSegCounts.sector1, ds.segments.sector1.length)
      trackSegCounts.sector2 = Math.max(trackSegCounts.sector2, ds.segments.sector2.length)
      trackSegCounts.sector3 = Math.max(trackSegCounts.sector3, ds.segments.sector3.length)
    })

    let anyChanged = false
    const resultMap = new Map<number, AcceptedSegments>()

    driverStates.forEach((ds) => {
      // Read the car dot's visual position for this driver.
      const cp = smoothedProgressRef.current?.get(ds.driverNumber)
        ?? carPositions.find((c) => c.driverNumber === ds.driverNumber)?.progress
      if (cp === undefined) return

      const lapDist = forwardDistance(sectorBoundaries.startFinish, cp)
      const s1End = forwardDistance(sectorBoundaries.startFinish, sectorBoundaries.sector1_2)
      const s2End = forwardDistance(sectorBoundaries.startFinish, sectorBoundaries.sector2_3)
      let currentSector = 2
      if (lapDist < s1End) currentSector = 0
      else if (lapDist < s2End) currentSector = 1

      // Detect S/F crossing (sector 3 → sector 1) to reset the buffer.
      const prevSector = pillSectorTracker.current.get(ds.driverNumber) ?? -1
      const crossedSF = prevSector === 2 && currentSector === 0
      pillSectorTracker.current.set(ds.driverNumber, currentSector)

      // Get or create the write-once buffer for this driver.
      // Buffer is sized to the track's canonical segment counts, not the individual
      // driver's data — ensures all drivers have the same number of pill slots.
      let entry = pillSegmentsRef.current.get(ds.driverNumber)
      if (!entry || entry.lap !== ds.currentLapNumber || crossedSF) {
        entry = {
          lap: ds.currentLapNumber,
          segments: {
            sector1: new Array(trackSegCounts.sector1).fill(null),
            sector2: new Array(trackSegCounts.sector2).fill(null),
            sector3: new Array(trackSegCounts.sector3).fill(null),
          },
        }
        pillSegmentsRef.current.set(ds.driverNumber, entry)
        anyChanged = true
      }

      // Resize arrays if track segment count changed (preserving existing stamps).
      const buf = entry.segments
      const resize = (key: keyof AcceptedSegments, trackCount: number) => {
        if (buf[key].length !== trackCount) {
          buf[key] = Array.from({ length: trackCount }, (_, i) => (i < buf[key].length ? buf[key][i] : null))
          anyChanged = true
        }
      }
      resize("sector1", trackSegCounts.sector1)
      resize("sector2", trackSegCounts.sector2)
      resize("sector3", trackSegCounts.sector3)

      // Stamp segments the visual car has exited.
      const changed = acceptSegments(buf, ds.segments, sectorBoundaries, lapDist)
      if (changed) anyChanged = true

      resultMap.set(ds.driverNumber, buf)
    })

    // Notify the parent only when something changed.
    if (anyChanged) {
      onPillSegments?.(resultMap)
    }
  }, [driverStates, sectorBoundaries, carPositions, smoothedProgressRef, onPillSegments])

  // Stamps segments into the write-once buffer as the car dot passes them.
  // Clears the buffer exactly when the car dot crosses the start/finish line.
  useEffect(() => {
    const emptyBuf: AcceptedSegments = { sector1: [], sector2: [], sector3: [] }

    // No driver selected — clear buffer.
    if (!selectedDriverNumber || !sectorBoundaries) {
      setAcceptedSegments(emptyBuf)
      prevSectorRef.current = -1
      return
    }

    // Find the selected driver's segment data.
    const ds = driverStates.find((d) => d.driverNumber === selectedDriverNumber)
    if (!ds) {
      setAcceptedSegments(emptyBuf)
      prevSectorRef.current = -1
      return
    }

    const rawSegs = ds.segments

    // Read the car dot's exact visual position (includes animation delay).
    const cp = smoothedProgressRef.current?.get(selectedDriverNumber)
      ?? carPositions.find((c) => c.driverNumber === selectedDriverNumber)?.progress
    if (cp === undefined) return

    // Determine which sector the car dot is currently in.
    const lapDist = forwardDistance(sectorBoundaries.startFinish, cp)
    const s1End = forwardDistance(sectorBoundaries.startFinish, sectorBoundaries.sector1_2)
    const s2End = forwardDistance(sectorBoundaries.startFinish, sectorBoundaries.sector2_3)
    let currentSector = 2
    if (lapDist < s1End) currentSector = 0
    else if (lapDist < s2End) currentSector = 1

    // Detect driver change — reset buffer and sector tracking.
    const driverChanged = selectedDriverNumber !== prevSelectedRef.current
    if (driverChanged) {
      prevSelectedRef.current = selectedDriverNumber
      prevSectorRef.current = currentSector
    }

    // Detect S/F crossing: car dot transitioned from S3 to S1.
    const crossedSF = !driverChanged && prevSectorRef.current === 2 && currentSector === 0
    prevSectorRef.current = currentSector

    // On S/F crossing or driver change, create a fresh buffer and stamp initial segments.
    if (crossedSF || driverChanged) {
      const fresh: AcceptedSegments = {
        sector1: new Array(rawSegs.sector1.length).fill(null),
        sector2: new Array(rawSegs.sector2.length).fill(null),
        sector3: new Array(rawSegs.sector3.length).fill(null),
      }
      acceptSegments(fresh, rawSegs, sectorBoundaries, lapDist)
      setAcceptedSegments(fresh)
      return
    }

    // Normal tick — stamp newly-passed segments into the buffer.
    setAcceptedSegments((prev) => {
      const next: AcceptedSegments = {
        sector1: prev.sector1.length === rawSegs.sector1.length ? [...prev.sector1] : new Array(rawSegs.sector1.length).fill(null),
        sector2: prev.sector2.length === rawSegs.sector2.length ? [...prev.sector2] : new Array(rawSegs.sector2.length).fill(null),
        sector3: prev.sector3.length === rawSegs.sector3.length ? [...prev.sector3] : new Array(rawSegs.sector3.length).fill(null),
      }
      const changed = acceptSegments(next, rawSegs, sectorBoundaries, lapDist)
      const resized = prev.sector1.length !== rawSegs.sector1.length
        || prev.sector2.length !== rawSegs.sector2.length
        || prev.sector3.length !== rawSegs.sector3.length
      return changed || resized ? next : prev
    })
  }, [driverStates, selectedDriverNumber, sectorBoundaries, carPositions, smoothedProgressRef])

  // Memoize the SVG path string. Slice off the extra closing point used for arc-length wrapping
  // since the SVG Z command already closes the path visually.
  const svgPathString = useMemo(
    () => (svgTrackPath ? buildSvgPath(svgTrackPath.slice(0, -1)) : ""),
    [svgTrackPath],
  )

  // Track stroke color based on track-wide flag status.
  const trackColor = useMemo(() => {
    switch (trackFlag) {
      case "YELLOW":
      case "DOUBLE YELLOW":
      case "SC":
      case "VSC":
      case "VSC_ENDING":
        return "#FFD700"
      case "RED":
        return "#E10600"
      default:
        return "#2a2a3a"
    }
  }, [trackFlag])

  // Whether the track path should flash (VSC ending).
  const trackFlashing = trackFlag === "VSC_ENDING"

  // PCA auto-rotation angle (landscape-optimal orientation).
  const pcaAngle = useMemo(
    () => (svgTrackPath ? computeRotationAngle(svgTrackPath) : 0),
    [svgTrackPath],
  )

  // Effective rotation: PCA base + admin override + live drag delta.
  const rotationAngle = pcaAngle + rotationOverride + (rotationDelta ?? 0)

  // Fire onRotationSave when a drag ends (delta transitions from non-zero to zero).
  const prevDeltaRef = useRef(0)
  useEffect(() => {
    const prev = prevDeltaRef.current
    prevDeltaRef.current = rotationDelta ?? 0
    // Drag ended: delta went back to zero after being non-zero.
    if (prev !== 0 && (rotationDelta ?? 0) === 0 && onRotationSave) {
      const finalRotation = ((rotationOverride + prev) % 360 + 360) % 360
      onRotationSave(trackName, finalRotation)
    }
  }, [rotationDelta, rotationOverride, trackName, onRotationSave])

  // Memoize the centroid for rotation transforms.
  const centroid = useMemo(
    () => (svgTrackPath ? computeCentroid(svgTrackPath) : { cx: 0, cy: 0 }),
    [svgTrackPath],
  )

  // Memoize the viewBox from the rotated track path bounds.
  const viewBox = useMemo(
    () => (svgTrackPath ? computeViewBox(svgTrackPath, rotationAngle, centroid.cx, centroid.cy) : "0 0 100 100"),
    [svgTrackPath, rotationAngle, centroid],
  )

  // Memoize the dot radius.
  const dotRadius = useMemo(() => computeDotRadius(svgTrackPath), [svgTrackPath])
  const strokeWidth = dotRadius * 0.3

  // Track stroke width relative to dot size.
  const trackStrokeWidth = dotRadius * 1.2

  // Y-negate corner positions to match SVG coordinate space (Y-down).
  const svgCorners = useMemo(
    () => corners?.map((c) => ({ number: c.number, x: c.trackPosition.x, y: -c.trackPosition.y })) ?? null,
    [corners],
  )

  // Computes sector line endpoints perpendicular to the track at each boundary.
  const sectorLineData = useMemo(() => {
    if (!svgTrackPath || !sectorBoundaries) return []

    const arcLengths = computeArcLengths(svgTrackPath)
    const halfLen = trackStrokeWidth * 1.2

    const boundaries = [
      { progress: sectorBoundaries.startFinish, color: "#e53935", key: "start-finish" },
      { progress: sectorBoundaries.sector1_2, color: "#000000", key: "sector-1-2" },
      { progress: sectorBoundaries.sector2_3, color: "#000000", key: "sector-2-3" },
    ]

    const result = boundaries.reduce<{ x1: number; y1: number; x2: number; y2: number; color: string; key: string }[]>(
      (lines, { progress, color, key }) => {
        const pt = getPointAndTangentAtProgress(svgTrackPath, arcLengths, progress)
        if (!pt) return lines

        // Compute smoothed tangent from two points slightly apart on the path.
        // Single-segment tangents can be inaccurate at the path wrap point (e.g. Silverstone S/F).
        const epsilon = 0.005
        const pBefore = getPointAtProgress(svgTrackPath, arcLengths, (progress - epsilon + 1) % 1)
        const pAfter = getPointAtProgress(svgTrackPath, arcLengths, (progress + epsilon) % 1)
        if (!pBefore || !pAfter) return lines

        const tdx = pAfter.x - pBefore.x
        const tdy = pAfter.y - pBefore.y
        const tLen = Math.sqrt(tdx * tdx + tdy * tdy)
        const smoothTangent = tLen > 0
          ? { dx: tdx / tLen, dy: tdy / tLen }
          : pt.tangent

        // Perpendicular direction (90° rotation of smoothed tangent).
        const perpX = -smoothTangent.dy
        const perpY = smoothTangent.dx

        lines.push({
          x1: pt.point.x - perpX * halfLen,
          y1: pt.point.y - perpY * halfLen,
          x2: pt.point.x + perpX * halfLen,
          y2: pt.point.y + perpY * halfLen,
          color,
          key,
        })
        return lines
      },
      [],
    )

    return result
  }, [svgTrackPath, sectorBoundaries, trackStrokeWidth])

  // Builds colored mini-sector segments and separator lines from the accepted buffer.
  // Only stamped (non-null) segments are rendered — no distance checks needed here.
  const miniSectorOverlay = useMemo(() => {
    const empty = { coloredSegments: [] as { path: string; color: string }[], separatorLines: [] as { x1: number; y1: number; x2: number; y2: number; key: string }[] }
    if (!selectedDriverNumber || !svgTrackPath || !sectorBoundaries) return empty
    if (acceptedSegments.sector1.length === 0 && acceptedSegments.sector2.length === 0 && acceptedSegments.sector3.length === 0) return empty

    const arcLengths = computeArcLengths(svgTrackPath)
    const halfLen = trackStrokeWidth * 0.6
    const coloredSegments: { path: string; color: string }[] = []
    const separatorLines: { x1: number; y1: number; x2: number; y2: number; key: string }[] = []

    // Define sector progress ranges using sector boundary positions.
    const sectorRanges = [
      { start: sectorBoundaries.startFinish, end: sectorBoundaries.sector1_2, segs: acceptedSegments.sector1, label: "s1" },
      { start: sectorBoundaries.sector1_2, end: sectorBoundaries.sector2_3, segs: acceptedSegments.sector2, label: "s2" },
      { start: sectorBoundaries.sector2_3, end: sectorBoundaries.startFinish, segs: acceptedSegments.sector3, label: "s3" },
    ]

    sectorRanges.forEach(({ start, end, segs, label }) => {
      if (segs.length === 0) return

      // Compute sector length in progress units (handling wrap-around for sector 3).
      let sectorLength = end - start
      if (sectorLength <= 0) sectorLength += 1.0
      const miniSectorLength = sectorLength / segs.length

      segs.forEach((value, i) => {
        let segStart = start + i * miniSectorLength
        let segEnd = start + (i + 1) * miniSectorLength

        // Normalize to 0-1 range.
        if (segStart >= 1.0) segStart -= 1.0
        if (segEnd > 1.0) segEnd -= 1.0

        // Add a separator line at each internal mini-sector boundary.
        if (i > 0) {
          const result = getPointAndTangentAtProgress(svgTrackPath, arcLengths, segStart)
          if (result) {
            const perpX = -result.tangent.dy
            const perpY = result.tangent.dx
            separatorLines.push({
              x1: result.point.x - perpX * halfLen,
              y1: result.point.y - perpY * halfLen,
              x2: result.point.x + perpX * halfLen,
              y2: result.point.y + perpY * halfLen,
              key: `${label}-sep-${i}`,
            })
          }
        }

        // Only render stamped (non-null) segments with a valid color.
        if (value === null) return
        const color = segmentColor(value)
        if (!color) return

        const subPath = getSubPath(svgTrackPath, arcLengths, segStart, segEnd)
        const pathString = buildOpenSvgPath(subPath)
        if (pathString) {
          coloredSegments.push({ path: pathString, color })
        }
      })
    })

    return { coloredSegments, separatorLines }
  }, [selectedDriverNumber, svgTrackPath, sectorBoundaries, acceptedSegments, trackStrokeWidth])

  // Minimum pit side confidence required to render the pit building.
  const MIN_PIT_SIDE_CONFIDENCE = 0.7

  // Computes the pit building SVG path — a line parallel to the track on the correct side.
  const pitBuildingPath = useMemo(() => {
    if (!svgTrackPath || !pitLaneProfile
        || pitLaneProfile.samplesCollected < 3
        || pitLaneProfile.pitSideConfidence < MIN_PIT_SIDE_CONFIDENCE) return null
    const arcLengths = computeArcLengths(svgTrackPath)
    const { entryProgress, exitProgress } = pitLaneProfile
    let { pitSide } = pitLaneProfile

    // Defensive winding check: if the display path winds in the opposite direction
    // from the reference path used to compute pitSide, flip the pit side.
    // Y-negation in svgTrackPath flips the signed area sign, so
    // referenceWindingCW=true (CW in Y-up) → positive signed area after Y-negate.
    if (pitLaneProfile.referenceWindingCW !== undefined) {
      const displayWindingCW = computeSignedArea(svgTrackPath) > 0
      if (displayWindingCW !== pitLaneProfile.referenceWindingCW) {
        pitSide = -pitSide
      }
    }

    const offsetDist = dotRadius * 2.2
    const steps = 40

    // Compute progress range (handle wrap-around if exit < entry).
    let progressRange = exitProgress - entryProgress
    if (progressRange <= 0) progressRange += 1.0

    // Pit lanes are at most ~40% of a circuit. If longer, entry/exit progress values
    // are going the wrong way around the track (common near start/finish line).
    if (progressRange > 0.4) return null

    const points: { x: number; y: number }[] = []
    for (let i = 0; i <= steps; i++) {
      let p = entryProgress + (i / steps) * progressRange
      if (p > 1) p -= 1
      const pt = getPointAndTangentAtProgress(svgTrackPath, arcLengths, p)
      if (!pt) continue
      // Perpendicular offset (same pattern as sector boundary lines).
      const perpX = -pt.tangent.dy
      const perpY = pt.tangent.dx
      points.push({
        x: pt.point.x + pitSide * offsetDist * perpX,
        y: pt.point.y + pitSide * offsetDist * perpY,
      })
    }
    return buildOpenSvgPath(points)
  }, [svgTrackPath, pitLaneProfile, dotRadius])

  const showNoSession = !demoMode && !sessionActive && !hasData

  // SVG group transform string for the PCA rotation.
  const rotateTransform = `rotate(${rotationAngle}, ${centroid.cx}, ${centroid.cy})`

  return (
    <div className="trackmap">
      {hasData && (
        <svg
          className="trackmap-svg"
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          onClick={handleSvgClick}
        >
          {/* Rotated group — all content uses original coordinates */}
          <g transform={rotateTransform}>
            {/* Track outline path — colored by track-wide flag status */}
            <path
              d={svgPathString}
              stroke={trackColor}
              strokeWidth={trackStrokeWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="none"
              className={trackFlashing ? "track-path--flashing" : undefined}
            />

            {/* Pit building — offset line following the track on the pit lane side */}
            {pitBuildingPath && (
              <path
                d={pitBuildingPath}
                stroke="#3a3a4a"
                strokeWidth={trackStrokeWidth / 1.4}
                strokeLinejoin="round"
                strokeLinecap="round"
                fill="none"
                className="pit-building"
              />
            )}

            {/* Mini-sector colored segments — only segments the car has passed */}
            {miniSectorOverlay.coloredSegments.map((seg, i) => (
              <path
                key={`mini-seg-${i}`}
                d={seg.path}
                stroke={seg.color}
                strokeWidth={trackStrokeWidth}
                strokeLinejoin="miter"
                strokeLinecap="butt"
                fill="none"
                className="mini-sector-segment"
              />
            ))}

            {/* Sector boundary lines — perpendicular to track at each boundary */}
            {sectorLineData.map((line) => (
              <line
                key={line.key}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={line.color}
                strokeWidth={trackStrokeWidth * 0.35}
                strokeLinecap="round"
                className="sector-line"
              />
            ))}

            {/* Mini-sector separator lines — thin perpendicular marks between segments */}
            {miniSectorOverlay.separatorLines.map((line) => (
              <line
                key={line.key}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#ffffff"
                strokeWidth={trackStrokeWidth * 0.15}
                strokeLinecap="round"
                className="mini-sector-separator"
              />
            ))}

            {/* Corner number labels */}
            {svgCorners?.map((corner) => (
              <text
                key={`corner-${corner.number}`}
                x={corner.x}
                y={corner.y}
                transform={`rotate(${-rotationAngle}, ${corner.x}, ${corner.y})`}
                className="corner-label"
                fontSize={dotRadius * 0.8}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {corner.number}
              </text>
            ))}

            {/* Car dots — non-selected cars are hidden via CSS (not removed from DOM)
                so rAF animation keeps running and avoids snap-back on re-show. */}
            {svgCarPositions.map((car) => {
              const isNew = !seenDrivers.current.has(car.driverNumber)
              if (isNew) seenDrivers.current.add(car.driverNumber)
              return (
                <CarDot
                  key={car.driverNumber}
                  ref={hasProgress ? getDotRef(car.driverNumber) : undefined}
                  driverNumber={car.driverNumber}
                  x={hasProgress ? 0 : car.x}
                  y={hasProgress ? 0 : car.y}
                  teamColour={car.teamColour}
                  dotRadius={dotRadius}
                  strokeWidth={strokeWidth}
                  isNew={isNew}
                  pathLocked={hasProgress}
                  hidden={!!selectedDriverNumber && car.driverNumber !== selectedDriverNumber}
                  flagColor={driverFlags.get(car.driverNumber) ?? null}
                  onSelect={handleCarClick}
                />
              )
            })}
          </g>
        </svg>
      )}

      {/* Connection status indicator */}
      {connectionStatus === "connecting" && !hasData && !demoMode && (
        <p className="trackmap-status">Connecting to live data...</p>
      )}

      {/* No session fallback (live mode only) */}
      {showNoSession && (
        <p className="trackmap-status">No live session data</p>
      )}
    </div>
  )
}

export default Trackmap
