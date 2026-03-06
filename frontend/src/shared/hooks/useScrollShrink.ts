import { useState, useCallback, useRef } from 'react'

interface UseScrollShrinkOptions {
  threshold?: number  // Scroll distance for full shrink (default: 70)
  maxShrink?: number  // Banner height reduction in px (default: 70)
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
// Compensates scrollTop for banner height changes to prevent speed amplification.
// Only updates React state when crossing key thresholds.
export const useScrollShrink = (options: UseScrollShrinkOptions = {}): UseScrollShrinkReturn => {
  const { threshold = 70, maxShrink = 70 } = options
  const [shrinkState, setShrinkState] = useState<ShrinkState>({ isShrunk: false, isActive: false })
  const bannerRef = useRef<HTMLDivElement>(null)
  const lastRatioRef = useRef(0)
  const forceShrunkRef = useRef(false)
  const isCompensatingRef = useRef(false)

  // Handler for scroll events - updates CSS variable directly via ref.
  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    // Skip scroll-based updates when force shrunk
    if (forceShrunkRef.current) return

    // Skip the synthetic scroll event caused by scrollTop compensation.
    if (isCompensatingRef.current) {
      isCompensatingRef.current = false
      return
    }

    const el = event.currentTarget
    const { scrollTop, scrollHeight, clientHeight } = el

    // Detect if we're at or near the bottom of scroll
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10

    // Calculate raw ratio from scroll position
    let ratio = Math.min(1, Math.max(0, scrollTop / threshold))

    // When at bottom with partial shrink, freeze the ratio at its last value.
    // This prevents the feedback loop without jarring snap to 1.
    if (isAtBottom && ratio > 0 && ratio < 1) {
      ratio = lastRatioRef.current
    }

    // Skip update if ratio hasn't meaningfully changed
    if (Math.abs(ratio - lastRatioRef.current) < 0.001) return

    // Compensate scrollTop for the banner height change.
    // When the banner shrinks by Δ px, the content-container grows by Δ px,
    // making the visual scroll appear faster than the user's finger movement.
    // Adjusting scrollTop by the delta neutralises this layout shift.
    const bannerDelta = maxShrink * (ratio - lastRatioRef.current)
    if (Math.abs(bannerDelta) > 0.5) {
      isCompensatingRef.current = true
      el.scrollTop = scrollTop - bannerDelta
    }

    // Update CSS variable directly - no React re-render, breaks feedback loop
    bannerRef.current?.style.setProperty('--shrink-ratio', String(ratio))

    // Only update React state when crossing thresholds (for .shrunk class and disabled state)
    const nowShrunk = ratio > 0.5
    const nowActive = ratio > 0

    lastRatioRef.current = ratio

    if (nowShrunk !== shrinkState.isShrunk || nowActive !== shrinkState.isActive) {
      setShrinkState({ isShrunk: nowShrunk, isActive: nowActive })
    }
  }, [threshold, maxShrink, shrinkState.isShrunk, shrinkState.isActive])

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
