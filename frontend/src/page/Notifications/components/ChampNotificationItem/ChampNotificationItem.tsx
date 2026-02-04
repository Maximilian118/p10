import React from "react"
import { useNavigate } from "react-router-dom"
import { NotificationType } from "../../../../shared/types"
import ImageIcon from "../../../../components/utility/icon/imageIcon/ImageIcon"
import "./_champNotificationItem.scss"

interface ChampNotificationItemProps {
  notification: NotificationType
}

// Championship notification content — renders a preview card linking to the championship.
const ChampNotificationItem: React.FC<ChampNotificationItemProps> = ({ notification }) => {
  const navigate = useNavigate()

  // Navigate to championship on card click.
  const handleChampClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (notification.champId) {
      navigate(`/championship/${notification.champId}`)
    }
  }

  const hasChampPreview = notification.champId && notification.champName && notification.champIcon

  if (!hasChampPreview) return null

  return (
    <div className="champ-notification-item__card" onClick={handleChampClick}>
      <ImageIcon src={notification.champIcon || ""} size="medium" />
      <p className="champ-notification-item__name">{notification.champName}</p>
    </div>
  )
}

export default ChampNotificationItem
