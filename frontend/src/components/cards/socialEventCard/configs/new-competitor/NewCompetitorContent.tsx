import React from "react"
import "./_new-competitor.scss"
import { ContentProps } from "../types"
import ImageIcon from "../../../../utility/icon/imageIcon/ImageIcon"
import PersonAddIcon from "@mui/icons-material/PersonAdd"

// Showcase-style content for new competitor (user joined platform) events.
const NewCompetitorContent: React.FC<ContentProps> = ({ event, config, onUserClick }) => (
  <>
    <PersonAddIcon className="social-event-card__showcase-icon" style={{ color: config.iconColor }} />
    <span className="social-event-card__showcase-hero">Welcome</span>
    <div className="social-event-card__showcase-user" onClick={onUserClick}>
      <ImageIcon src={event.userSnapshot.icon} size="small" />
      <span className="social-event-card__showcase-name">{event.userSnapshot.name}</span>
    </div>
    <span className="social-event-card__showcase-sub">Joined P10</span>
  </>
)

export default NewCompetitorContent
