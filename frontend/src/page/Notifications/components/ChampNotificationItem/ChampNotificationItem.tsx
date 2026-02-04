import React from "react"
import { NotificationType } from "../../../../shared/types"
import ImageIcon from "../../../../components/utility/icon/imageIcon/ImageIcon"
import "./_champNotificationItem.scss"

interface ChampNotificationItemProps {
  notification: NotificationType
}

// Championship notification content — renders a preview card with icon and name.
// Presentational only — navigation is handled by the parent container.
const ChampNotificationItem: React.FC<ChampNotificationItemProps> = ({ notification }) => {
  const hasChampPreview = notification.champId && notification.champName && notification.champIcon

  if (!hasChampPreview) return null

  return (
    <div className="champ-notification-item__card">
      <ImageIcon src={notification.champIcon || ""} size="medium" />
      <p className="champ-notification-item__name">{notification.champName}</p>
    </div>
  )
}

export default ChampNotificationItem
