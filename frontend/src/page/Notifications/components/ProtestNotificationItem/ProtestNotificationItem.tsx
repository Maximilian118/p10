import React from "react"
import { useNavigate } from "react-router-dom"
import { NotificationType, ProtestStatus } from "../../../../shared/types"
import ImageIcon from "../../../../components/utility/icon/imageIcon/ImageIcon"
import StatusCard from "../../../../components/cards/statusCard/StatusCard"
import "./_protestNotificationItem.scss"
import Points from "../../../../components/utility/points/Points"

interface ProtestNotificationItemProps {
  notification: NotificationType
}

// Returns color based on points sign: positive = success, negative = error, zero/falsy = default.
const getPointsColor = (points: number | undefined): "success" | "error" | "default" => {
  if (!points) return "default"
  return points > 0 ? "success" : "error"
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

  const isDenied = notification.type === "protest_denied"
  const isPassed = notification.type === "protest_passed"
  const hasProtestPoints = (isPassed || isDenied) && notification.filerPoints !== undefined

  // For denied protests, only show filer penalty (points < 0). No accused/VS.
  const showFilerPoints = hasProtestPoints && (!isDenied || (notification.filerPoints ?? 0) < 0)

  return (
    <>
      <div className="protest-notification-item__avatars" style={{ justifyContent: isDenied ? "center" : "space-evenly"}}>
        {/* Filer avatar — navigates to filer's profile */}
        <ImageIcon src={notification.filerIcon || ""} size="large" onClick={() => handleFilerClick}/>
        {showFilerPoints && <Points total={notification.filerPoints ?? 0} color={getPointsColor(notification.filerPoints)} darkMode/>}
        {/* Accused section — only for passed protests */}
        {!isDenied && notification.accusedName && notification.accusedIcon && (
          <>
            <span className="protest-notification-item__vs">VS</span>
            {hasProtestPoints && notification.accusedPoints !== undefined && (
              <Points total={notification.accusedPoints ?? 0} color={getPointsColor(notification.accusedPoints)} darkMode/>
            )}
            <ImageIcon src={notification.accusedIcon} size="large" onClick={() => handleAccusedClick}/>
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
