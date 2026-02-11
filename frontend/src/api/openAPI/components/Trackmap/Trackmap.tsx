import React, { useMemo, useEffect, useRef, useCallback } from "react"
import useTrackmap from "../../useTrackmap"
import usePathLockedPositions from "./usePathLockedPositions"
import FillLoading from "../../../../components/utility/fillLoading/FillLoading"
import { computeArcLengths, getPointAndTangentAtProgress } from "./trackPathUtils"
import "./_trackmap.scss"

interface TrackmapProps {
  onDriverSelect?: (driver: {
    driverNumber: number
    nameAcronym: string
    fullName: string
    teamName: string
    teamColour: string
  } | null) => void
  demoMode?: boolean
  onTrackReady?: () => void
}

interface CarDotProps {
  driverNumber: number
  x: number
  y: number
  teamColour: string
  nameAcronym: string
  fullName: string
  teamName: string
  dotRadius: number
  strokeWidth: number
  isNew: boolean
  pathLocked: boolean
  onSelect?: (driver: {
    driverNumber: number
    nameAcronym: string
    fullName: string
    teamName: string
    teamColour: string
  }) => void
}

// Renders a single car dot positioned via CSS transform.
// In CSS mode: `transition: transform 800ms linear` handles smooth interpolation.
// In path-locked mode: rAF loop writes transform directly to the DOM element via
// the forwarded ref — React does not set style.transform (rAF is sole owner).
const CarDot = React.memo(React.forwardRef<SVGGElement, CarDotProps>(({
  driverNumber, x, y, teamColour, nameAcronym, fullName, teamName,
  dotRadius, strokeWidth, isNew, pathLocked, onSelect,
}, ref) => {
  // Build class name based on mode.
  let className = "car-dot-group"
  if (isNew) className += " car-dot-group--no-transition"
  else if (pathLocked) className += " car-dot-group--path-locked"

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
        className="car-dot"
        onClick={() => onSelect?.({
          driverNumber, nameAcronym, fullName, teamName, teamColour,
        })}
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

// computeArcLengths and getPointAndTangentAtProgress imported from trackPathUtils.

// Renders a live F1 track map as SVG with car position dots.
// The track outline is rendered from a precomputed path (from the backend),
// and car positions are overlaid as coloured circles animated via CSS transitions.
// The track is rotated via PCA to fill a landscape container optimally.
const Trackmap: React.FC<TrackmapProps> = ({ onDriverSelect, demoMode, onTrackReady }) => {
  const {
    trackPath, carPositions, sessionActive, trackName,
    corners, sectorBoundaries, connectionStatus, demoPhase,
  } = useTrackmap()
  const trackReadyFired = useRef(false)

  // Tracks which drivers have rendered at least once. On initial appearance
  // the transition is suppressed so dots don't slide from the SVG origin.
  const seenDrivers = useRef<Set<number>>(new Set())

  // Negate Y to convert from math coordinates (Y-up) to SVG coordinates (Y-down).
  const svgTrackPath = useMemo(
    () => trackPath?.map((p) => ({ x: p.x, y: -p.y })) ?? null,
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
  const { registerDot } = usePathLockedPositions(
    hasProgress ? carPositions : [],
    hasProgress ? svgTrackPath : null,
  )

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

  // No data state.
  const hasData = svgTrackPath && svgTrackPath.length > 0

  // Fire the onTrackReady callback once when track data first arrives.
  useEffect(() => {
    if (hasData && !trackReadyFired.current) {
      trackReadyFired.current = true
      onTrackReady?.()
    }
  }, [hasData, onTrackReady])

  // Clean up seenDrivers when drivers leave so that re-appearing drivers
  // get the no-transition initial placement again.
  useEffect(() => {
    const currentDrivers = new Set(svgCarPositions.map((c) => c.driverNumber))
    seenDrivers.current.forEach((dn) => {
      if (!currentDrivers.has(dn)) seenDrivers.current.delete(dn)
    })
  }, [svgCarPositions])

  // Memoize the SVG path string.
  const svgPathString = useMemo(
    () => (svgTrackPath ? buildSvgPath(svgTrackPath) : ""),
    [svgTrackPath],
  )

  // Memoize the rotation angle from PCA.
  const rotationAngle = useMemo(
    () => (svgTrackPath ? computeRotationAngle(svgTrackPath) : 0),
    [svgTrackPath],
  )

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

    return boundaries.reduce<{ x1: number; y1: number; x2: number; y2: number; color: string; key: string }[]>(
      (lines, { progress, color, key }) => {
        const result = getPointAndTangentAtProgress(svgTrackPath, arcLengths, progress)
        if (!result) return lines

        // Perpendicular direction (90° rotation of tangent).
        const perpX = -result.tangent.dy
        const perpY = result.tangent.dx

        lines.push({
          x1: result.point.x - perpX * halfLen,
          y1: result.point.y - perpY * halfLen,
          x2: result.point.x + perpX * halfLen,
          y2: result.point.y + perpY * halfLen,
          color,
          key,
        })
        return lines
      },
      [],
    )
  }, [svgTrackPath, sectorBoundaries, trackStrokeWidth])

  const showNoSession = !demoMode && !sessionActive && !hasData

  // Demo mode: show spinner while backend is fetching data or waiting for track to build.
  if (demoMode && (demoPhase === "fetching" || !hasData)) {
    return (
      <div className="trackmap">
        <FillLoading />
      </div>
    )
  }

  // Determine the title to display (hidden in demo mode — shown in the header instead).
  const displayTitle = demoMode ? null : trackName

  // SVG group transform string for the PCA rotation.
  const rotateTransform = `rotate(${rotationAngle}, ${centroid.cx}, ${centroid.cy})`

  return (
    <div className="trackmap">
      {/* Track name header (live mode only) */}
      {displayTitle && (
        <p className="trackmap-title">{displayTitle}</p>
      )}

      {hasData && (
        <svg
          className="trackmap-svg"
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Rotated group — all content uses original coordinates */}
          <g transform={rotateTransform}>
            {/* Track outline path */}
            <path
              d={svgPathString}
              stroke="#2a2a3a"
              strokeWidth={trackStrokeWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="none"
            />

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

            {/* Car dots — path-locked (rAF via direct DOM) when progress available, CSS transitions otherwise */}
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
                  nameAcronym={car.nameAcronym}
                  fullName={car.fullName}
                  teamName={car.teamName}
                  dotRadius={dotRadius}
                  strokeWidth={strokeWidth}
                  isNew={isNew}
                  pathLocked={hasProgress}
                  onSelect={onDriverSelect}
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
