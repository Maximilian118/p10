import React, { useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
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
// Container handles all primary navigation; children are presentational.
const NotificationListItem: React.FC<NotificationListItemProps> = ({
  notification,
  onClear,
  onBadgeClick,
  onVisible,
}) => {
  const navigate = useNavigate()
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

  // Handle container click — navigate based on notification type.
  const handleClick = () => {
    const isBadge = notification.type === "badge_earned" && notification.badgeSnapshot
    const isProtest = isProtestNotification(notification.type)

    if (isBadge && onBadgeClick) {
      onBadgeClick(notification.badgeSnapshot!)
    } else if (isProtest && notification.champId && notification.protestId) {
      navigate(`/championship/${notification.champId}?view=protest&protestId=${notification.protestId}`)
    } else if (notification.champId) {
      navigate(`/championship/${notification.champId}`)
    }
  }

  // Handle clear button click (stopPropagation prevents container navigation).
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClear(notification._id)
  }

  const isBadge = notification.type === "badge_earned" && notification.badgeSnapshot
  const isProtest = isProtestNotification(notification.type)

  // Render the type-specific content component.
  const renderContent = () => {
    if (isBadge) {
      return <BadgeNotificationItem notification={notification} />
    }
    if (isProtest) {
      return <ProtestNotificationItem notification={notification} />
    }
    return <ChampNotificationItem notification={notification} />
  }

  const description = isProtest && notification.protestTitle ? notification.protestTitle : notification.description

  return (
    <div className="notification-list-item" ref={itemRef} onClick={handleClick}>
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
      <p className="notification-list-item__description">{description}</p>
      <div className="notification-list-item__timestamp-row">
        {!notification.read && <span className="notification-list-item__unread-dot" />}
        <p className="notification-list-item__timestamp">
          {formatRelativeTime(notification.createdAt)}
          {notification.filerName && ` — ${notification.filerName}`}
        </p>
      </div>

      {/* Type-specific content (presentational) */}
      {renderContent()}
    </div>
  )
}

export default NotificationListItem
