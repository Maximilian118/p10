import React, { useMemo } from 'react'
import './_auraRing.scss'

interface AuraRingProps {
  colors: string[]
  size?: number
  glowIntensity?: number
  speed?: number
  className?: string
}

// Predefined animation variants - circles orbit around the ring perimeter
const animationVariants = [
  'auraOrbit1',
  'auraOrbit2',
  'auraOrbit3',
  'auraOrbit4',
  'auraOrbit5',
  'auraOrbit6',
]

// Base durations for each animation to create variety
const baseDurations = [20, 25, 18, 23, 21, 27]

const AuraRing: React.FC<AuraRingProps> = ({
  colors,
  size = 100,
  glowIntensity = 1,
  speed = 1,
  className = '',
}) => {
  // Generate circle configurations with unique animations (must be before early return)
  const circles = useMemo(() => {
    return colors.map((color, index) => ({
      color,
      animation: animationVariants[index % animationVariants.length],
      duration: baseDurations[index % baseDurations.length] / speed,
      delay: (index * 3) % 12,
    }))
  }, [colors, speed])

  // Don't render if no colors
  if (!colors.length) return null

  // Calculate sizes
  const glowBleed = 25 * glowIntensity
  const containerSize = size + glowBleed * 2

  // Circles sized to create substantial glow through the ring mask
  const circleSize = size * 0.75

  // The orbit radius - where circle centers travel (at the ring edge)
  // Should be about half the inner radius so circles stay near the visible ring area
  const orbitRadius = size / 6

  // Inner radius in pixels - the transparent hole should match the target element exactly
  // Target element has diameter = size, so radius = size/2
  const innerRadiusPx = size / 2 - 2

  return (
    <div
      className={`aura-ring ${className}`}
      style={{
        width: containerSize,
        height: containerSize,
        '--inner-radius': `${innerRadiusPx}px`,
        '--orbit-radius': `${orbitRadius}px`,
        '--circle-size': `${circleSize}px`,
      } as React.CSSProperties}
    >
      <div className="aura-ring__mask">
        {circles.map((circle, index) => (
          <div
            key={`${circle.color}-${index}`}
            className="aura-ring__circle"
            style={{
              width: circleSize,
              height: circleSize,
              background: circle.color,
              filter: `blur(${10 * glowIntensity}px)`,
              animationName: circle.animation,
              animationDuration: `${circle.duration}s`,
              animationDelay: `-${circle.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default AuraRing
