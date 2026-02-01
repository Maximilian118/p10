import { useState, useCallback, useRef } from 'react'

interface UseScrollShrinkOptions {
  threshold?: number  // Scroll distance for full shrink (default: 70)
}

interface ShrinkState {
  isShrunk: boolean  // True when ratio > 0.5 (for text truncation)
  isActive: boolean  // True when ratio > 0 (for disabled states)
}

interface UseScrollShrinkReturn {
  shrinkState: ShrinkState
  handleScroll: (event: React.UIEvent<HTMLElement>) => void
  bannerRef: React.RefObject<HTMLDivElement>
  setForceShrunk: (forceShrunk: boolean) => void
}

// Calculates shrink ratio (0-1) based on scroll position.
// Uses ref-based CSS variable updates to avoid React re-render feedback loops.
// Only updates React state when crossing key thresholds.
export const useScrollShrink = (options: UseScrollShrinkOptions = {}): UseScrollShrinkReturn => {
  const { threshold = 70 } = options
  const [shrinkState, setShrinkState] = useState<ShrinkState>({ isShrunk: false, isActive: false })
  const bannerRef = useRef<HTMLDivElement>(null)
  const lastRatioRef = useRef(0)
  const forceShrunkRef = useRef(false)

  // Handler for scroll events - updates CSS variable directly via ref.
  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    // Skip scroll-based updates when force shrunk
    if (forceShrunkRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget

    // Detect if we're at or near the bottom of scroll
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10

    // Calculate raw ratio from scroll position
    let ratio = Math.min(1, Math.max(0, scrollTop / threshold))

    // FIX: When at bottom with partial shrink, freeze the ratio at its last value.
    // This prevents the feedback loop without jarring snap to 1.
    // Banner stays at whatever position it naturally reached (e.g., 0.63).
    if (isAtBottom && ratio > 0 && ratio < 1) {
      ratio = lastRatioRef.current
    }

    // Skip update if ratio hasn't meaningfully changed
    if (Math.abs(ratio - lastRatioRef.current) < 0.001) return

    // Update CSS variable directly - no React re-render, breaks feedback loop
    bannerRef.current?.style.setProperty('--shrink-ratio', String(ratio))

    // Only update React state when crossing thresholds (for .shrunk class and disabled state)
    const nowShrunk = ratio > 0.5
    const nowActive = ratio > 0

    lastRatioRef.current = ratio

    if (nowShrunk !== shrinkState.isShrunk || nowActive !== shrinkState.isActive) {
      setShrinkState({ isShrunk: nowShrunk, isActive: nowActive })
    }
  }, [threshold, shrinkState.isShrunk, shrinkState.isActive])

  // Force shrunk state for dialogs/confirmations - bypasses scroll-based ratio.
  const setForceShrunk = useCallback((forceShrunk: boolean) => {
    forceShrunkRef.current = forceShrunk
    if (forceShrunk) {
      bannerRef.current?.style.setProperty('--shrink-ratio', '1')
      setShrinkState({ isShrunk: true, isActive: true })
    } else {
      // Reset to last scroll-based ratio
      bannerRef.current?.style.setProperty('--shrink-ratio', String(lastRatioRef.current))
      setShrinkState({
        isShrunk: lastRatioRef.current > 0.5,
        isActive: lastRatioRef.current > 0
      })
    }
  }, [])

  return { shrinkState, handleScroll, bannerRef, setForceShrunk }
}
