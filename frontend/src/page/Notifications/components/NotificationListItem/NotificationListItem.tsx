import React, { useRef, useEffect } from "react"
import Close from "@mui/icons-material/Close"
import { NotificationType, userBadgeSnapshotType } from "../../../../shared/types"
import { formatRelativeTime } from "../../../../shared/utility"
import ChampNotificationItem from "../ChampNotificationItem/ChampNotificationItem"
import BadgeNotificationItem from "../BadgeNotificationItem/BadgeNotificationItem"
import ProtestNotificationItem from "../ProtestNotificationItem/ProtestNotificationItem"
import "./_notificationListItem.scss"

interface NotificationListItemProps {
  notification: NotificationType
  onClear: (id: string) => void
  onBadgeClick?: (badge: userBadgeSnapshotType) => void
  onVisible?: (id: string) => void
}

// Check if notification type is a protest notification.
const isProtestNotification = (type: string): boolean => {
  return [
    "protest_filed",
    "protest_vote_required",
    "protest_passed",
    "protest_denied",
    "protest_expired",
  ].includes(type)
}

// Shared notification shell — renders header, description, timestamp, unread dot,
// and routes to the correct type-specific child component.
const NotificationListItem: React.FC<NotificationListItemProps> = ({
  notification,
  onClear,
  onBadgeClick,
  onVisible,
}) => {
  const itemRef = useRef<HTMLDivElement>(null)
  const visibilityTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Set up IntersectionObserver to detect when notification is visible.
  useEffect(() => {
    // Skip if already read or no callback provided.
    if (notification.read || !onVisible) return

    const element = itemRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting) {
          // Start a timer when notification becomes visible.
          visibilityTimerRef.current = setTimeout(() => {
            onVisible(notification._id)
          }, 500) // 500ms delay to prevent marking during fast scroll.
        } else {
          // Clear timer if notification leaves viewport before delay.
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
  }, [notification._id, notification.read, onVisible])

  // Handle clear button click.
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClear(notification._id)
  }

  const isBadge = notification.type === "badge_earned" && notification.badgeSnapshot
  const isProtest = isProtestNotification(notification.type)

  // Render the type-specific content component.
  const renderContent = () => {
    if (isBadge) {
      return <BadgeNotificationItem notification={notification} onBadgeClick={onBadgeClick} />
    }
    if (isProtest) {
      return <ProtestNotificationItem notification={notification} />
    }
    return <ChampNotificationItem notification={notification} />
  }

  return (
    <div className="notification-list-item" ref={itemRef}>
      <div className="notification-list-item__header">
        <h3 className="notification-list-item__title">{notification.title}</h3>
        <button
          className="notification-list-item__clear"
          onClick={handleClear}
          aria-label="Clear notification"
        >
          <Close />
        </button>
      </div>

      <p className="notification-list-item__description">{notification.description}</p>

      {/* Protest title if different from notification title */}
      {isProtest && notification.protestTitle && (
        <p className="notification-list-item__protest-title">{notification.protestTitle}</p>
      )}

      <div className="notification-list-item__timestamp-row">
        {!notification.read && <span className="notification-list-item__unread-dot" />}
        <p className="notification-list-item__timestamp">
          {formatRelativeTime(notification.createdAt)}
          {notification.filerName && ` — ${notification.filerName}`}
        </p>
      </div>

      {/* Type-specific content */}
      {renderContent()}
    </div>
  )
}

export default NotificationListItem
