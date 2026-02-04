import React, { useRef, useEffect } from "react"
import { ProtestType } from "../../../../../../shared/types"
import { formatRelativeTime } from "../../../../../../shared/utility"
import StatusCard from "../../../../../../components/cards/statusCard/StatusCard"
import "./_protestItem.scss"

interface ProtestItemProps {
  protest: ProtestType
  isAdjudicator?: boolean
  hasUnreadNotification?: boolean
  onClick?: () => void
  onVisible?: (protestId: string) => void
}

// Protest item component for displaying individual protests in a list.
const ProtestItem: React.FC<ProtestItemProps> = ({
  protest,
  isAdjudicator = false,
  hasUnreadNotification = false,
  onClick,
  onVisible,
}) => {
  const itemRef = useRef<HTMLDivElement>(null)
  const visibilityTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Check if action is required (adjudicator needs to allocate points).
  const actionRequired =
    isAdjudicator && (protest.status === "passed" || protest.status === "denied") && !protest.pointsAllocated

  const isOpen = protest.status === "adjudicating" || protest.status === "voting"

  // Set up IntersectionObserver to mark related notification as read when visible.
  useEffect(() => {
    if (!hasUnreadNotification || !onVisible) return

    const element = itemRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting) {
          // Start a timer when protest item becomes visible.
          visibilityTimerRef.current = setTimeout(() => {
            onVisible(protest._id)
          }, 500) // 500ms delay to prevent marking during fast scroll.
        } else {
          // Clear timer if item leaves viewport before delay.
          if (visibilityTimerRef.current) {
            clearTimeout(visibilityTimerRef.current)
            visibilityTimerRef.current = null
          }
        }
      },
      { threshold: 0.5 }, // Trigger when 50% visible.
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
      if (visibilityTimerRef.current) {
        clearTimeout(visibilityTimerRef.current)
      }
    }
  }, [protest._id, hasUnreadNotification, onVisible])

  // Build container class name with closed modifier.
  const containerClass = ["protest-item", !isOpen && !actionRequired && "protest-item--closed"]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={containerClass} onClick={onClick} ref={itemRef}>
      <h3 className="protest-item__title">{protest.title}</h3>

      <p className="protest-item__description">{protest.description}</p>

      <div className="protest-item__timestamp-row">
        {(actionRequired || hasUnreadNotification) && (
          <span className={`protest-item__unread-dot ${actionRequired ? "protest-item__unread-dot--action" : ""}`} />
        )}
        <p className="protest-item__timestamp">{formatRelativeTime(protest.created_at)}</p>
        <span className="protest-item__separator">-</span>
        <p className="protest-item__author">{protest.competitor?.name}</p>
      </div>

      {/* Use the reusable StatusCard component */}
      <StatusCard status={protest.status} votes={protest.votes} actionRequired={actionRequired} />
    </div>
  )
}

export default ProtestItem
