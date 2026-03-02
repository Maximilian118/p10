import React, { useContext } from "react"
import "./_socialEventCard.scss"
import { useNavigate } from "react-router-dom"
import { SocialEventType } from "../../../shared/socialTypes"
import { formatRelativeTime } from "../../../shared/utils/formatTime"
import CommentSection from "./CommentSection"
import AppContext from "../../../context"
import { getEventConfig } from "./configs"
import { EventContentStyle } from "./configs/types"

// Converts an EventContentStyle config into React inline styles.
const buildContentStyle = (style?: EventContentStyle): React.CSSProperties => {
  if (!style) return {}

  const css: React.CSSProperties = {}

  if (style.borderSide && style.borderColor) {
    const border = `3px solid ${style.borderColor}`
    if (style.borderSide === "left") css.borderLeft = border
    else css.borderTop = border
  }

  if (style.background) css.background = style.background

  return css
}

// Displays a single social event in the feed with config-driven visuals.
const SocialEventCard: React.FC<{ event: SocialEventType }> = ({ event }) => {
  const navigate = useNavigate()
  const { user } = useContext(AppContext)
  const config = getEventConfig(event.kind)

  // Resolve the display title (static or dynamic from config).
  const title = config.getTitle ? config.getTitle(event.payload) : config.title

  // Navigate to the user's profile when clicking their name/icon.
  const handleUserClick = () => {
    if (event.user === user._id) {
      navigate("/profile")
    } else {
      navigate(`/profile/${event.user}`)
    }
  }

  const IconComponent = config.Icon
  const ContentComponent = config.ContentComponent

  return (
    <div className={`social-event-card ${config.layout !== "default" ? `social-event-card--${config.layout}` : ""}`}>
      {/* Header: event icon, category title, and timestamp. */}
      <div className="social-event-card__header">
        <div className="social-event-card__title-row">
          <IconComponent className="social-event-card__header-icon" style={{ color: config.iconColor }} />
          <span className="social-event-card__title">{title}</span>
        </div>
        <span className="social-event-card__time">{formatRelativeTime(event.created_at)}</span>
      </div>

      {/* Content: styled per config, rendered by the config's content component. */}
      <div className="social-event-card__content" style={buildContentStyle(config.contentStyle)}>
        <ContentComponent event={event} config={config} onUserClick={handleUserClick} />
      </div>

      {/* Comments section. */}
      <CommentSection eventId={event._id} commentCount={event.commentCount} />
    </div>
  )
}

export default SocialEventCard
