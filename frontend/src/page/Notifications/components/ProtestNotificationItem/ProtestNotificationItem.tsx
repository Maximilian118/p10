import React from "react"
import { useNavigate } from "react-router-dom"
import { NotificationType, ProtestStatus } from "../../../../shared/types"
import ImageIcon from "../../../../components/utility/icon/imageIcon/ImageIcon"
import StatusCard from "../../../../components/cards/statusCard/StatusCard"
import "./_protestNotificationItem.scss"

interface ProtestNotificationItemProps {
  notification: NotificationType
}

// Format points display with sign.
const formatPoints = (points: number | undefined): string => {
  if (points === undefined) return ""
  return points > 0 ? `+${points}` : `${points}`
}

// Protest notification content — renders head-to-head avatars, points, and status card.
// Container handles protest navigation; avatars handle profile navigation via stopPropagation.
const ProtestNotificationItem: React.FC<ProtestNotificationItemProps> = ({ notification }) => {
  const navigate = useNavigate()

  // Navigate to filer's profile (stopPropagation prevents container navigation).
  const handleFilerClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (notification.filerId) {
      navigate(`/profile/${notification.filerId}`)
    }
  }

  // Navigate to accused's profile (stopPropagation prevents container navigation).
  const handleAccusedClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (notification.accusedId) {
      navigate(`/profile/${notification.accusedId}`)
    }
  }

  const hasProtestPoints =
    (notification.type === "protest_passed" || notification.type === "protest_denied") &&
    notification.filerPoints !== undefined

  return (
    <>
      <div className="protest-notification-item__avatars">
        {/* Filer avatar — navigates to filer's profile */}
          <div className="protest-notification-item__avatar" onClick={handleFilerClick}>
            <ImageIcon src={notification.filerIcon || ""} size="large" />
            {hasProtestPoints && (
              <span
                className={`protest-notification-item__points ${
                  notification.filerPoints && notification.filerPoints > 0
                    ? "protest-notification-item__points--positive"
                    : "protest-notification-item__points--negative"
                }`}
              >
                {formatPoints(notification.filerPoints)}
              </span>
            )}
          </div>

          {notification.accusedName && notification.accusedIcon && (
            <>
              <span className="protest-notification-item__vs">VS</span>
              {/* Accused avatar — navigates to accused's profile */}
              <div className="protest-notification-item__avatar" onClick={handleAccusedClick}>
                <ImageIcon src={notification.accusedIcon} size="large" />
                {hasProtestPoints && notification.accusedPoints !== undefined && (
                  <span className="protest-notification-item__points protest-notification-item__points--negative">
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
    </>
  )
}

export default ProtestNotificationItem
