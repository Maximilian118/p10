import React, { useContext } from "react"
import "./_socialEventCard.scss"
import { useNavigate } from "react-router-dom"
import { SocialEventType, SocialEventPayload } from "../../../shared/socialTypes"
import { formatRelativeTime } from "../../../shared/utils/formatTime"
import ImageIcon from "../../utility/icon/imageIcon/ImageIcon"
import Badge from "../../utility/badge/Badge"
import { getBadgeColour } from "../../utility/badge/badgeOverlay/badgeOverlayUtility"
import CommentSection from "./CommentSection"
import AppContext from "../../../context"
import { getEventConfig } from "./configs"
import { EventContentStyle, SocialEventConfig } from "./configs/types"

const RARITY_NAMES = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"]

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

// Badge showcase content for badge_earned events.
const BadgeContent: React.FC<{ payload: SocialEventPayload; userName: string }> = ({ payload, userName }) => {
  const rarity = payload.badgeRarity ?? 0
  const rarityName = RARITY_NAMES[rarity] ?? "Common"
  const rarityColour = getBadgeColour(rarity)

  // Build a minimal badge object for the Badge component.
  const badgeObj = { url: payload.badgeUrl ?? null, rarity, zoom: 100, name: payload.badgeName ?? null, awardedHow: null, awardedDesc: null }

  return (
    <>
      <span className="social-event-card__rarity-tag" style={{ color: rarityColour, borderColor: rarityColour }}>
        {rarityName}
      </span>
      <div className="social-event-card__badge-showcase">
        <Badge badge={badgeObj} zoom={100} showEditButton={false} overlayThickness={3} style={{ width: 80, height: 80 }} />
      </div>
      <p className="social-event-card__badge-label">
        <strong>{userName}</strong> earned the <strong>{payload.badgeName}</strong> badge
      </p>
    </>
  )
}

// Showcase content for high-impact events (victory, champion, streak, etc.).
const ShowcaseContent: React.FC<{
  event: SocialEventType
  config: SocialEventConfig
  onUserClick: () => void
}> = ({ event, config, onUserClick }) => {
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

// Default content for all non-badge events: user row + icon + text.
const DefaultContent: React.FC<{
  event: SocialEventType
  config: SocialEventConfig
  onUserClick: () => void
}> = ({ event, config, onUserClick }) => {
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

      {/* Content: styled per config, rendered per layout. */}
      <div className="social-event-card__content" style={buildContentStyle(config.contentStyle)}>
        {config.layout === "badge" && (
          <BadgeContent payload={event.payload} userName={event.userSnapshot.name} />
        )}
        {config.layout === "default" && (
          <DefaultContent event={event} config={config} onUserClick={handleUserClick} />
        )}
        {config.layout !== "badge" && config.layout !== "default" && (
          <ShowcaseContent event={event} config={config} onUserClick={handleUserClick} />
        )}
      </div>

      {/* Comments section. */}
      <CommentSection eventId={event._id} commentCount={event.commentCount} />
    </div>
  )
}

export default SocialEventCard
