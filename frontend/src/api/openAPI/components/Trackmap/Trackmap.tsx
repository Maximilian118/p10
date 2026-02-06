import React, { useMemo } from "react"
import useTrackmap from "../../useTrackmap"
import { CarPosition } from "../../types"
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
}

// Converts an array of {x, y} points into an SVG path string.
const buildSvgPath = (path: { x: number; y: number }[]): string => {
  if (path.length === 0) return ""
  const [first, ...rest] = path
  return `M ${first.x},${first.y} ${rest.map((p) => `L ${p.x},${p.y}`).join(" ")} Z`
}

// Computes the SVG viewBox from track path and car positions with padding.
const computeViewBox = (
  path: { x: number; y: number }[] | null,
  positions: CarPosition[],
): string => {
  const allPoints: { x: number; y: number }[] = []

  if (path) allPoints.push(...path)
  positions.forEach((p) => allPoints.push({ x: p.x, y: p.y }))

  if (allPoints.length === 0) return "0 0 100 100"

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  allPoints.forEach((p) => {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
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
// and car positions are overlaid as coloured circles.
const Trackmap: React.FC<TrackmapProps> = ({ onDriverSelect, demoMode }) => {
  const { trackPath, carPositions, sessionActive, trackName, connectionStatus, demoPhase } = useTrackmap()

  // Memoize the SVG path string.
  const svgPathString = useMemo(
    () => (trackPath ? buildSvgPath(trackPath) : ""),
    [trackPath],
  )

  // Memoize the viewBox.
  const viewBox = useMemo(
    () => computeViewBox(trackPath, carPositions),
    [trackPath, carPositions],
  )

  // Memoize the dot radius.
  const dotRadius = useMemo(() => computeDotRadius(trackPath), [trackPath])
  const strokeWidth = dotRadius * 0.3

  // Track stroke width relative to dot size.
  const trackStrokeWidth = dotRadius * 2

  // No data state.
  const hasData = trackPath && trackPath.length > 0
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
          {/* Track outline path */}
          <path
            d={svgPathString}
            stroke="#2a2a3a"
            strokeWidth={trackStrokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
          />

          {/* Car dots at current positions */}
          {carPositions.map((car) => (
            <circle
              key={car.driverNumber}
              cx={car.x}
              cy={car.y}
              r={dotRadius}
              fill={`#${car.teamColour}`}
              stroke="#ffffff"
              strokeWidth={strokeWidth}
              className="car-dot"
              onClick={() => onDriverSelect?.({
                driverNumber: car.driverNumber,
                nameAcronym: car.nameAcronym,
                fullName: car.fullName,
                teamName: car.teamName,
                teamColour: car.teamColour,
              })}
            />
          ))}
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
