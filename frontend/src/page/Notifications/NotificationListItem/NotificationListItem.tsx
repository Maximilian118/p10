import React, { useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Close from "@mui/icons-material/Close"
import { NotificationType, userBadgeSnapshotType, ProtestStatus } from "../../../shared/types"
import { formatRelativeTime } from "../../../shared/utility"
import ImageIcon from "../../../components/utility/icon/imageIcon/ImageIcon"
import Badge from "../../../components/utility/badge/Badge"
import StatusCard from "../../../components/cards/statusCard/StatusCard"
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

// Format points display with sign.
const formatPoints = (points: number | undefined): string => {
  if (points === undefined) return ""
  return points > 0 ? `+${points}` : `${points}`
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

  // Handle protest notification click - navigate to protest detail.
  const handleProtestClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (notification.champId && notification.protestId) {
      navigate(`/championship/${notification.champId}?view=protest&protestId=${notification.protestId}`)
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
  const isProtest = isProtestNotification(notification.type)
  const hasProtestPoints =
    (notification.type === "protest_passed" || notification.type === "protest_denied") &&
    notification.filerPoints !== undefined

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

      {/* Protest preview with head-to-head avatars */}
      {isProtest && (
        <div className="notification-list-item__protest-preview" onClick={handleProtestClick}>
          {/* Head-to-head avatars */}
          <div className="notification-list-item__protest-avatars">
            <div className="notification-list-item__protest-avatar">
              <ImageIcon src={notification.filerIcon || ""} size="medium" />
              {hasProtestPoints && (
                <span
                  className={`notification-list-item__protest-points ${
                    notification.filerPoints && notification.filerPoints > 0
                      ? "notification-list-item__protest-points--positive"
                      : "notification-list-item__protest-points--negative"
                  }`}
                >
                  {formatPoints(notification.filerPoints)}
                </span>
              )}
            </div>

            {notification.accusedName && notification.accusedIcon && (
              <>
                <span className="notification-list-item__protest-vs">VS</span>
                <div className="notification-list-item__protest-avatar">
                  <ImageIcon src={notification.accusedIcon} size="medium" />
                  {hasProtestPoints && notification.accusedPoints !== undefined && (
                    <span className="notification-list-item__protest-points notification-list-item__protest-points--negative">
                      {formatPoints(notification.accusedPoints)}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Status card for protest status */}
          {notification.protestStatus && (
            <StatusCard status={notification.protestStatus as ProtestStatus} variant="notification" />
          )}
        </div>
      )}

      {/* Championship preview card for non-protest notifications */}
      {hasChampPreview && !isBadgeNotification && !isProtest && (
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
