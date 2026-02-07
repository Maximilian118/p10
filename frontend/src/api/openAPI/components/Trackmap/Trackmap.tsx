import React, { useMemo, useEffect, useRef } from "react"
import useTrackmap from "../../useTrackmap"
import FillLoading from "../../../../components/utility/fillLoading/FillLoading"
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
  onSelect?: (driver: {
    driverNumber: number
    nameAcronym: string
    fullName: string
    teamName: string
    teamColour: string
  }) => void
}

// Renders a single car dot positioned via CSS transform. The parent SCSS rule
// applies `transition: transform 800ms linear` for GPU-accelerated smooth
// interpolation between position updates (~3.7 Hz from OpenF1). The transition
// duration is intentionally longer than the update interval so dots are always
// mid-transition and never stop moving.
const CarDot = React.memo<CarDotProps>(({
  driverNumber, x, y, teamColour, nameAcronym, fullName, teamName,
  dotRadius, strokeWidth, isNew, onSelect,
}) => (
  <g
    className={`car-dot-group${isNew ? " car-dot-group--no-transition" : ""}`}
    style={{ transform: `translate(${x}px, ${y}px)` }}
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
), (prev, next) =>
  prev.x === next.x
  && prev.y === next.y
  && prev.teamColour === next.teamColour
  && prev.dotRadius === next.dotRadius
  && prev.isNew === next.isNew
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

// Renders a live F1 track map as SVG with car position dots.
// The track outline is rendered from a precomputed path (from the backend),
// and car positions are overlaid as coloured circles animated via CSS transitions.
// The track is rotated via PCA to fill a landscape container optimally.
const Trackmap: React.FC<TrackmapProps> = ({ onDriverSelect, demoMode, onTrackReady }) => {
  const { trackPath, carPositions, sessionActive, trackName, connectionStatus, demoPhase } = useTrackmap()
  const trackReadyFired = useRef(false)

  // Tracks which drivers have rendered at least once. On initial appearance
  // the transition is suppressed so dots don't slide from the SVG origin.
  const seenDrivers = useRef<Set<number>>(new Set())

  // No data state.
  const hasData = trackPath && trackPath.length > 0

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
    const currentDrivers = new Set(carPositions.map((c) => c.driverNumber))
    seenDrivers.current.forEach((dn) => {
      if (!currentDrivers.has(dn)) seenDrivers.current.delete(dn)
    })
  }, [carPositions])

  // Memoize the SVG path string.
  const svgPathString = useMemo(
    () => (trackPath ? buildSvgPath(trackPath) : ""),
    [trackPath],
  )

  // Memoize the rotation angle from PCA.
  const rotationAngle = useMemo(
    () => (trackPath ? computeRotationAngle(trackPath) : 0),
    [trackPath],
  )

  // Memoize the centroid for rotation transforms.
  const centroid = useMemo(
    () => (trackPath ? computeCentroid(trackPath) : { cx: 0, cy: 0 }),
    [trackPath],
  )

  // Memoize the viewBox from the rotated track path bounds.
  const viewBox = useMemo(
    () => (trackPath ? computeViewBox(trackPath, rotationAngle, centroid.cx, centroid.cy) : "0 0 100 100"),
    [trackPath, rotationAngle, centroid],
  )

  // Memoize the dot radius.
  const dotRadius = useMemo(() => computeDotRadius(trackPath), [trackPath])
  const strokeWidth = dotRadius * 0.3

  // Track stroke width relative to dot size.
  const trackStrokeWidth = dotRadius * 2

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

            {/* Car dots — positioned via CSS transform, animated via CSS transition */}
            {carPositions.map((car) => {
              const isNew = !seenDrivers.current.has(car.driverNumber)
              if (isNew) seenDrivers.current.add(car.driverNumber)
              return (
                <CarDot
                  key={car.driverNumber}
                  driverNumber={car.driverNumber}
                  x={car.x}
                  y={car.y}
                  teamColour={car.teamColour}
                  nameAcronym={car.nameAcronym}
                  fullName={car.fullName}
                  teamName={car.teamName}
                  dotRadius={dotRadius}
                  strokeWidth={strokeWidth}
                  isNew={isNew}
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
