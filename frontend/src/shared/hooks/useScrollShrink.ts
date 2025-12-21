import { useState, useCallback } from 'react'

interface UseScrollShrinkOptions {
  threshold?: number  // Scroll distance for full shrink (default: 70)
}

interface UseScrollShrinkReturn {
  shrinkRatio: number
  handleScroll: (event: React.UIEvent<HTMLElement>) => void
}

// Calculates shrink ratio (0-1) based on scroll position.
// Used for scroll-based animations like shrinking headers.
export const useScrollShrink = (options: UseScrollShrinkOptions = {}): UseScrollShrinkReturn => {
  const { threshold = 70 } = options
  const [shrinkRatio, setShrinkRatio] = useState(0)

  // Handler for scroll events - calculates and updates shrink ratio.
  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    const scrollTop = event.currentTarget.scrollTop
    const ratio = Math.min(1, Math.max(0, scrollTop / threshold))
    setShrinkRatio(ratio)
  }, [threshold])

  return { shrinkRatio, handleScroll }
}
