import React, { useRef, useState, useEffect } from 'react'
import AuraRing from './AuraRing'
import './_auraRing.scss'

interface AuraRingWrapperProps {
  colors: string[]
  children: React.ReactNode
  glowIntensity?: number
  speed?: number
  className?: string
}

// Wrapper component that automatically measures its children and sizes AuraRing accordingly
const AuraRingWrapper: React.FC<AuraRingWrapperProps> = ({
  colors,
  children,
  glowIntensity = 1,
  speed = 1,
  className = '',
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(0)

  // Measure the wrapper's actual size on mount and resize
  useEffect(() => {
    const measureSize = () => {
      if (wrapperRef.current) {
        const { width } = wrapperRef.current.getBoundingClientRect()
        setSize(width)
      }
    }

    measureSize()

    // Re-measure on window resize
    window.addEventListener('resize', measureSize)
    return () => window.removeEventListener('resize', measureSize)
  }, [])

  return (
    <div ref={wrapperRef} className={`aura-ring-wrapper ${className}`}>
      {size > 0 && (
        <AuraRing
          colors={colors}
          size={size}
          glowIntensity={glowIntensity}
          speed={speed}
        />
      )}
      {children}
    </div>
  )
}

export default AuraRingWrapper
