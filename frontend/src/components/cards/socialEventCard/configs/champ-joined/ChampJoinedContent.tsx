import React from "react"
import "./_champ-joined.scss"
import { ContentProps } from "../types"
import ImageIcon from "../../../../utility/icon/imageIcon/ImageIcon"

// Showcase-style content for championship joined events.
const ChampJoinedContent: React.FC<ContentProps> = ({ event, onUserClick }) => {
  const { payload } = event

  return (
    <>
      {payload.champIcon && (
        <div className="social-event-card__champ-joined-icon">
          <ImageIcon src={payload.champIcon} size="x-large" />
        </div>
      )}
      <div className="social-event-card__showcase-user" onClick={onUserClick}>
        <ImageIcon src={event.userSnapshot.icon} size="small" />
        <span className="social-event-card__showcase-name">{event.userSnapshot.name}</span>
      </div>
      <span className="social-event-card__showcase-sub">Joined <strong>{payload.champName}</strong></span>
    </>
  )
}

export default ChampJoinedContent
