import React from "react"
import "./_tempGauge.scss"

interface TempGaugeProps {
  temperature: number
  label: "TRC" | "AIR"
}

// Arc geometry constants for the circular gauge.
const SIZE = 36
const CENTER = SIZE / 2
const RADIUS = 14
const STROKE_WIDTH = 3
// Arc spans from 135° to 405° (270° total, gap at bottom).
const START_ANGLE = 135
const END_ANGLE = 405
const ARC_SPAN = END_ANGLE - START_ANGLE
// Temperature range mapped to the arc (0°C to 60°C).
const MIN_TEMP = 0
const MAX_TEMP = 60

// Converts degrees to radians.
const toRad = (deg: number) => (deg * Math.PI) / 180

// Computes an SVG point on the circle at a given angle (degrees).
const polarToCartesian = (angleDeg: number) => ({
  x: CENTER + RADIUS * Math.cos(toRad(angleDeg)),
  y: CENTER + RADIUS * Math.sin(toRad(angleDeg)),
})

// Builds an SVG arc path between two angles.
const describeArc = (startDeg: number, endDeg: number): string => {
  const start = polarToCartesian(startDeg)
  const end = polarToCartesian(endDeg)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

// Interpolates between green (cold), yellow (mid), and red (hot).
const temperatureColor = (temp: number): string => {
  const t = Math.max(0, Math.min(1, (temp - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)))
  if (t < 0.5) {
    // Green → Yellow (0.0 → 0.5)
    const ratio = t / 0.5
    const r = Math.round(0 + ratio * 255)
    const g = Math.round(200 + ratio * 55)
    return `rgb(${r}, ${g}, 0)`
  }
  // Yellow → Red (0.5 → 1.0)
  const ratio = (t - 0.5) / 0.5
  const g = Math.round(255 - ratio * 255)
  return `rgb(255, ${g}, 0)`
}

// Circular temperature gauge with a colored arc, value, and label.
// Displays track or air temperature within a compact SVG gauge.
const TempGauge: React.FC<TempGaugeProps> = ({ temperature, label }) => {
  const clamped = Math.max(MIN_TEMP, Math.min(MAX_TEMP, temperature))
  const ratio = (clamped - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)
  const fillAngle = START_ANGLE + ratio * ARC_SPAN
  const color = temperatureColor(temperature)

  return (
    <div className="temp-gauge">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Background arc (full track, dimmed). */}
        <path
          d={describeArc(START_ANGLE, END_ANGLE)}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />
        {/* Filled arc representing the temperature value. */}
        {ratio > 0 && (
          <path
            d={describeArc(START_ANGLE, fillAngle)}
            fill="none"
            stroke={color}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="temp-gauge__text">
        <span className="temp-gauge__value">{Math.round(temperature)}</span>
        <span className="temp-gauge__label">{label}</span>
      </div>
    </div>
  )
}

export default TempGauge
