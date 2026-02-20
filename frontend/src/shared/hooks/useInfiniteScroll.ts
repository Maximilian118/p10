import { useRef, useEffect, useCallback } from "react"

interface UseInfiniteScrollOptions {
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
  threshold?: number
}

// Hook that uses IntersectionObserver to trigger loading more items when a sentinel enters viewport.
export const useInfiniteScroll = ({ hasMore, loading, onLoadMore, threshold = 0.1 }: UseInfiniteScrollOptions) => {
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Memoised callback to avoid re-creating the observer on every render.
  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      if (entry.isIntersecting && hasMore && !loading) {
        onLoadMore()
      }
    },
    [hasMore, loading, onLoadMore],
  )

  // Set up IntersectionObserver on the sentinel element.
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(handleIntersect, { threshold })

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [handleIntersect, threshold])

  return sentinelRef
}
