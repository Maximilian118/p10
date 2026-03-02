import React from "react"
import "./_default.scss"
import { ContentProps } from "../types"
import ImageIcon from "../../../../utility/icon/imageIcon/ImageIcon"

// Default content for non-showcase events: user row + icon + text.
const DefaultContent: React.FC<ContentProps> = ({ event, config, onUserClick }) => {
  const text = config.getText(event.userSnapshot.name, event.payload)
  const IconComponent = config.Icon

  return (
    <>
      {/* Clickable user info row. */}
      <div className="social-event-card__user" onClick={onUserClick}>
        <ImageIcon src={event.userSnapshot.icon} size="small" />
        <span className="social-event-card__name">{event.userSnapshot.name}</span>
      </div>

      {/* Icon + descriptive text. */}
      <div className="social-event-card__content-default">
        {config.useChampIcon && event.payload.champIcon ? (
          <div className="social-event-card__champ-icon">
            <ImageIcon src={event.payload.champIcon} size="medium" />
          </div>
        ) : (
          <IconComponent className="social-event-card__content-icon" style={{ color: config.iconColor }} />
        )}
        <p className="social-event-card__text">{text}</p>
      </div>
    </>
  )
}

export default DefaultContent
