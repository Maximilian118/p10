import { useRef, useEffect, useCallback, RefObject } from "react"

interface UseInfiniteScrollOptions {
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
  root?: RefObject<HTMLElement | null>
  rootMargin?: string
  threshold?: number
}

// Hook that uses IntersectionObserver to trigger loading more items when a sentinel approaches the viewport.
export const useInfiniteScroll = ({
  hasMore, loading, onLoadMore,
  root, rootMargin = "0px", threshold = 0.1,
}: UseInfiniteScrollOptions) => {
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

    const observer = new IntersectionObserver(handleIntersect, {
      root: root?.current ?? null,
      rootMargin,
      threshold,
    })

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [handleIntersect, root, rootMargin, threshold])

  return sentinelRef
}
