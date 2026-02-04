import React from "react"
import { NotificationType } from "../../../../shared/types"
import Badge from "../../../../components/utility/badge/Badge"
import "./_badgeNotificationItem.scss"

interface BadgeNotificationItemProps {
  notification: NotificationType
}

// Badge notification content — renders a badge preview with name and tap hint.
// Presentational only — navigation is handled by the parent container.
const BadgeNotificationItem: React.FC<BadgeNotificationItemProps> = ({ notification }) => {
  if (!notification.badgeSnapshot) return null

  return (
    <div className="badge-notification-item__preview">
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
