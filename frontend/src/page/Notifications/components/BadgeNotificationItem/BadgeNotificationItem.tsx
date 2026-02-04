import React from "react"
import { NotificationType, userBadgeSnapshotType } from "../../../../shared/types"
import Badge from "../../../../components/utility/badge/Badge"
import "./_badgeNotificationItem.scss"

interface BadgeNotificationItemProps {
  notification: NotificationType
  onBadgeClick?: (badge: userBadgeSnapshotType) => void
}

// Badge notification content — renders a badge preview that opens the celebration modal.
const BadgeNotificationItem: React.FC<BadgeNotificationItemProps> = ({ notification, onBadgeClick }) => {
  // Handle badge click - open celebration modal.
  const handleBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (notification.badgeSnapshot && onBadgeClick) {
      onBadgeClick(notification.badgeSnapshot)
    }
  }

  if (!notification.badgeSnapshot) return null

  return (
    <div className="badge-notification-item__preview" onClick={handleBadgeClick}>
      <Badge badge={notification.badgeSnapshot} zoom={100} />
      <div>
        <p className="badge-notification-item__name">
          {notification.badgeSnapshot.customName || notification.badgeSnapshot.name}
        </p>
        <p className="badge-notification-item__tap">Tap to view</p>
      </div>
    </div>
  )
}

export default BadgeNotificationItem
