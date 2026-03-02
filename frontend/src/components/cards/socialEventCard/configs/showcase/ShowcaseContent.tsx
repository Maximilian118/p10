import React from "react"
import "./_showcase.scss"
import { ContentProps } from "../types"
import ImageIcon from "../../../../utility/icon/imageIcon/ImageIcon"

// Shared showcase content for high-impact events (victory, champion, streak, etc.).
const ShowcaseContent: React.FC<ContentProps> = ({ event, config, onUserClick }) => {
  const IconComponent = config.Icon
  const heroText = config.showcase?.getHeroText(event.payload) ?? ""
  const subtitle = config.showcase?.getSubtitle?.(event.payload)

  return (
    <>
      <IconComponent className="social-event-card__showcase-icon" style={{ color: config.iconColor }} />
      <span className="social-event-card__showcase-hero">{heroText}</span>
      <div className="social-event-card__showcase-user" onClick={onUserClick}>
        <ImageIcon src={event.userSnapshot.icon} size="small" />
        <span className="social-event-card__showcase-name">{event.userSnapshot.name}</span>
      </div>
      {subtitle && <span className="social-event-card__showcase-sub">{subtitle}</span>}
    </>
  )
}

export default ShowcaseContent
