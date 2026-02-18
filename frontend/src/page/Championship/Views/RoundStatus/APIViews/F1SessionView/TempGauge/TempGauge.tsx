import React from "react"
import "./_tempGauge.scss"

interface TempGaugeProps {
  temperature: number
  label: string
  min?: number
  max?: number
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
// Default range (0°C to 60°C) — can be overridden via min/max props.
const DEFAULT_MIN = 0
const DEFAULT_MAX = 60

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

// Interpolates between green (low), yellow (mid), and red (high).
const gaugeColor = (value: number, min: number, max: number): string => {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)))
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

// Circular gauge with a colored arc, value, and label.
// Range defaults to 0–60 but can be overridden via min/max props.
const TempGauge: React.FC<TempGaugeProps> = ({ temperature, label, min = DEFAULT_MIN, max = DEFAULT_MAX }) => {
  const clamped = Math.max(min, Math.min(max, temperature))
  const ratio = (clamped - min) / (max - min)
  const fillAngle = START_ANGLE + ratio * ARC_SPAN
  const color = gaugeColor(temperature, min, max)

  return (
    <div className="temp-gauge">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Background arc (full track, dimmed). */}
        <path
          d={describeArc(START_ANGLE, END_ANGLE)}
          fill="none"
          stroke="rgba(0,0,0,0.2)"
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
