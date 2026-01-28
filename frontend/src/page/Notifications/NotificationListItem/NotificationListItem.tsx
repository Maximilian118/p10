import React, { useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Close from "@mui/icons-material/Close"
import { NotificationType, userBadgeSnapshotType } from "../../../shared/types"
import ImageIcon from "../../../components/utility/icon/imageIcon/ImageIcon"
import Badge from "../../../components/utility/badge/Badge"
import "./_notificationListItem.scss"

interface NotificationListItemProps {
  notification: NotificationType
  onClear: (id: string) => void
  onBadgeClick?: (badge: userBadgeSnapshotType) => void
  onVisible?: (id: string) => void
}

// Formats a date string to relative time (e.g., "2 hours ago").
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`

  return date.toLocaleDateString()
}

// Notification list item component for displaying individual notifications.
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
      { threshold: 0.5 } // Trigger when 50% visible.
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

  // Handle championship card click - navigate to championship.
  const handleChampClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (notification.champId) {
      navigate(`/championship/${notification.champId}`)
    }
  }

  // Handle badge click - open celebration modal.
  const handleBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (notification.badgeSnapshot && onBadgeClick) {
      onBadgeClick(notification.badgeSnapshot)
    }
  }

  // Check if notification has championship data for preview card.
  const hasChampPreview = notification.champId && notification.champName && notification.champIcon
  const isBadgeNotification = notification.type === "badge_earned" && notification.badgeSnapshot

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

      <div className="notification-list-item__timestamp-row">
        {!notification.read && <span className="notification-list-item__unread-dot" />}
        <p className="notification-list-item__timestamp">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      {/* Championship preview card for invite notifications */}
      {hasChampPreview && !isBadgeNotification && (
        <div className="notification-list-item__champ-card" onClick={handleChampClick}>
          <ImageIcon src={notification.champIcon || ""} size="medium" />
          <p className="notification-list-item__champ-name">{notification.champName}</p>
        </div>
      )}

      {/* Badge preview for badge earned notifications */}
      {isBadgeNotification && notification.badgeSnapshot && (
        <div className="notification-list-item__badge-preview" onClick={handleBadgeClick}>
          <Badge badge={notification.badgeSnapshot} zoom={100} />
          <div>
            <p className="notification-list-item__badge-name">
              {notification.badgeSnapshot.customName || notification.badgeSnapshot.name}
            </p>
            <p className="notification-list-item__badge-tap">Tap to view</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationListItem
