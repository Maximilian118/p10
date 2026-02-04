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
const ProtestNotificationItem: React.FC<ProtestNotificationItemProps> = ({ notification }) => {
  const navigate = useNavigate()

  // Navigate to protest detail on click.
  const handleProtestClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (notification.champId && notification.protestId) {
      navigate(`/championship/${notification.champId}?view=protest&protestId=${notification.protestId}`)
    }
  }

  const hasProtestPoints =
    (notification.type === "protest_passed" || notification.type === "protest_denied") &&
    notification.filerPoints !== undefined

  return (
    <div className="protest-notification-item__preview" onClick={handleProtestClick}>
      {/* Head-to-head avatars */}
      <div className="protest-notification-item__avatars">
        <div className="protest-notification-item__avatar">
          <ImageIcon src={notification.filerIcon || ""} size="medium" />
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
            <div className="protest-notification-item__avatar">
              <ImageIcon src={notification.accusedIcon} size="medium" />
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
    </div>
  )
}

export default ProtestNotificationItem
